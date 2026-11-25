import { applyInternalRules } from './internal-rule-update';
import { queryKnowledge } from './dws/knowledge';
import type { KnowledgeResult } from '../shared/knowledge';
import { conversationHistory, validateInternalChat } from './conversation-chat';
import { createProcessingTrace } from './processing-trace';
import { createRecordStore } from './record-store';
import { listContacts, listGroups } from './dws/directory';
import type { DirectoryResult } from '../shared/types';
import { listReplyModels } from './model-catalog';
import { openConfigDirectory } from './open-config-directory';
import { type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defaults, validate } from '../shared/config';
import { errorMessage } from '../shared/errors';
import type {
  ContactSearchResult,
  ConversationRuleUpdate,
  GroupSearchResult,
  ModelCatalog,
  Endpoint,
  Ledger,
  PluginSnapshot,
  ProcessingRecord,
  ReplyConfig,
  RuntimeState,
} from '../shared/types';
import type { HostContext } from './contracts';
import { resolveAccount } from './dws/account';
import { runDws } from './dws/command';
import { searchGroups } from './dws/groups';
import { searchContacts } from './dws/contacts';
import { sendArgs, type DeliveryReceipt } from './dws/message-policy';
import { startSubscription } from './dws/subscription';
import { acquireInstanceLock, type InstanceLock } from './instance-lock';
import { Processor } from './message-processor';
import { createReplyGenerator } from './model';
import { readJson, writeJsonAtomic } from './storage';
export async function createRuntime(context: HostContext) {
  const stateDirectory = join(
    process.env.DSH_HOME || join(homedir(), '.dsh'),
    'plugins',
    'dws-personal-reply',
  );
  await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
  const configPath = join(stateDirectory, 'config.json');
  let config = validate(await readJson(configPath, defaults));
  const ledger = await readJson<Ledger>(join(stateDirectory, 'ledger.json'), {});
  let recordStore = await createRecordStore({ directory: stateDirectory, profile: config.profile });
  const saveRules = async (params: ConversationRuleUpdate): Promise<void> => {
    const next = applyInternalRules({ config, ...params });
    await writeJsonAtomic(configPath, next);
    config = next;
  };
  const verifyOwnerSend = async (): Promise<void> => {
    const identity = await resolveAccount(config.profile);
    if (identity.selfId !== config.selfId) throw new Error('钉钉账号已变化，请重新关联账号');
  };
  const generate = createReplyGenerator(context, stateDirectory);
  let controller: AbortController | undefined;
  let processor: Processor | undefined;
  let lock: InstanceLock | undefined;
  let children: ChildProcess[] = [];
  let closing = false;
  const state: RuntimeState = {
    phase: 'disabled',
    streams: {},
    records: recordStore.records,
    error: '',
    account: '',
  };
  const snapshot = (): PluginSnapshot => ({ config, state, configPath });
  const report = (record: ProcessingRecord) => {
    const saved = recordStore.append(record);
    state.records = recordStore.records;
    void saved.catch(() => {
      state.error = '处理记录保存失败，请检查磁盘空间和配置目录权限';
    });
  };
  const saveLedger = async (value: Ledger) => {
    const cutoff = Date.now() - 7 * 86400000;
    for (const [k, v] of Object.entries(value)) if (v.time < cutoff) delete value[k];
    await writeJsonAtomic(join(stateDirectory, 'ledger.json'), value);
  };
  /** 先取消模型和监听，再等待处理队列结束，最后释放实例锁。 */
  async function stop() {
    controller?.abort();
    await Promise.all(
      children.map(
        (child) =>
          new Promise<void>((resolve) => {
            if (child.exitCode !== null || child.signalCode !== null) return resolve();
            child.once('close', () => resolve());
            child.kill('SIGTERM');
          }),
      ),
    );
    children = [];
    await processor?.queue;
    await recordStore.flush();
    processor = undefined;
    if (lock) {
      await lock.release();
      lock = undefined;
    }
    state.streams = {};
    state.phase = 'disabled';
    state.error = '';
  }
  /** 任何监听失败都停止本实例，防止界面显示运行中但部分来源已失效。 */
  function fail(reason: string): void {
    state.phase = 'error';
    state.error = reason;
    controller?.abort();
    for (const child of children) child.kill('SIGTERM');
  }
  async function start() {
    if (!config.enabled || closing) return;
    state.phase = 'starting';
    state.error = '';
    try {
      const identity = await resolveAccount(config.profile);
      if (identity.selfId !== config.selfId) throw new Error('钉钉账号已变化，请重新关联账号');
      state.account = identity.label;
      state.accountDetails = identity.details;
      // 独占锁防止多个 DSH 配置同时代答，避免重复发送。
      lock = await acquireInstanceLock(join(stateDirectory, 'instance.lock'));
      controller = new AbortController();
      const signal = controller.signal;
      processor = new Processor({
        getConfig: () => config,
        saveRules,
        verifyOwnerSend,
        getHistory: (kind, target, conversationId) =>
          conversationHistory({
            records: recordStore.records,
            kind,
            target,
            conversationId,
            limit: config.historyTurns,
          }),
        ledger,
        saveLedger,
        signal,
        report,
        generate,
        send: (replyConfig, target, text, signal) =>
          runDws<DeliveryReceipt>(sendArgs(replyConfig, target), { input: text, signal: signal }),
      });
      const kinds: Array<'all-direct' | 'at-me'> = [];
      if (config.directPolicy !== 'off') kinds.push('all-direct');
      if (config.groupPolicy !== 'off') kinds.push('at-me');
      for (const kind of kinds) {
        state.streams[kind] = 'connecting';
        const child = startSubscription({
          profile: config.profile,
          kind,
          signal,
          onReady() {
            state.streams[kind] = 'ready';
            if (Object.values(state.streams).every((status) => status === 'ready')) {
              state.phase = config.mode === 'auto' ? 'running' : 'draft';
            }
          },
          onMessage(event) {
            void processor!.accept(event).catch(() => fail('写入代答记录失败，已停止'));
          },
          onFailure(reason) {
            state.streams[kind] = 'stopped';
            fail(reason);
          },
        });
        children.push(child);
      }
    } catch (error) {
      await stop();
      state.phase = 'error';
      state.error = errorMessage(error);
    }
  }
  /** 所有配置变更经 RPC 串行调用；先停旧实例，再持久化并启动新配置。 */
  async function dispatch(
    endpoint: Endpoint,
    payload?: unknown,
  ): Promise<
    | PluginSnapshot
    | ContactSearchResult
    | GroupSearchResult
    | ModelCatalog
    | DirectoryResult
    | KnowledgeResult
  > {
    if (endpoint === 'knowledge') return queryKnowledge({ profile: config.profile, payload });
    if (endpoint === 'listContacts') return listContacts(config.profile, payload);
    if (endpoint === 'listGroups') return listGroups(config.profile, payload);
    if (endpoint === 'listModels') return listReplyModels(context);
    if (endpoint === 'get') return snapshot();
    if (endpoint === 'internalChat') {
      const params = validateInternalChat(payload);
      if (!config.profile) throw new Error('请先关联钉钉账号');
      if (state.records.some((record) => record.requestId === params.requestId)) return snapshot();
      if (
        !config[`${params.kind}Ids`].includes(params.target) &&
        !state.records.some(
          (record) => record.kind === params.kind && record.target === params.target,
        )
      )
        throw new Error('请先保存联系人或群聊名单，再打开对话');
      const worker =
        (processor && !controller?.signal.aborted ? processor : undefined) ??
        new Processor({
          getConfig: () => config,
          saveRules,
          verifyOwnerSend,
          getHistory: (kind, target, conversationId) =>
            conversationHistory({
              records: recordStore.records,
              kind,
              target,
              conversationId,
              limit: config.historyTurns,
            }),
          saveLedger,
          ledger,
          generate,
          report,
          signal: AbortSignal.timeout(120000),
          send: (replyConfig, target, text, signal) =>
            runDws<DeliveryReceipt>(sendArgs(replyConfig, target), { input: text, signal }),
        });
      await worker.chat({
        ...params,
        conversationId: state.records.find(
          (record) =>
            record.kind === params.kind && record.target === params.target && record.conversationId,
        )?.conversationId,
      });
      await recordStore.flush();
      return snapshot();
    }
    if (endpoint === 'refreshAccount') {
      if (!config.profile || !config.selfId) throw new Error('请先关联钉钉账号');
      const identity = await resolveAccount(config.profile);
      if (identity.selfId !== config.selfId) throw new Error('钉钉账号已变化，请重新关联账号');
      // 刷新只替换展示资料，保留当前配置与消息监听。
      state.account = identity.label;
      state.accountDetails = identity.details;
      return snapshot();
    }
    if (endpoint === 'openConfigDirectory') {
      await openConfigDirectory(stateDirectory);
      return snapshot();
    }
    if (endpoint === 'searchGroups') return searchGroups(config.profile, payload);
    if (endpoint === 'searchContacts') {
      return searchContacts(config.profile, payload);
    }
    if (endpoint === 'test') {
      const trace = createProcessingTrace(0);
      const answer = await generate(
        '你好，请用一句话确认你能正常生成中文回复。',
        [],
        config,
        AbortSignal.timeout(90000),
        'self-test',
        undefined,
        trace.update,
      );
      report({
        time: new Date().toISOString(),
        kind: 'test',
        sender: '本地模型自检',
        input: '你好，请用一句话确认你能正常生成中文回复。',
        trace: trace.finish(),
        target: '本地',
        status: 'draft',
        answer,
      });
      return snapshot();
    }
    if (endpoint === 'connect') {
      if (config.enabled) throw new Error('请先关闭代答再关联账号');
      const found = await resolveAccount(
        typeof payload === 'object' &&
          payload !== null &&
          'profile' in payload &&
          typeof payload.profile === 'string'
          ? payload.profile
          : '',
      );
      const nextStore = await createRecordStore({
        directory: stateDirectory,
        profile: found.profile,
      });
      await recordStore.flush();
      config = validate({ ...config, profile: found.profile, selfId: found.selfId });
      await writeJsonAtomic(configPath, config);
      recordStore = nextStore;
      state.records = recordStore.records;
      state.account = found.label;
      state.accountDetails = found.details;
      return snapshot();
    }
    if (endpoint === 'save') {
      const next = validate(payload as Partial<ReplyConfig>);
      if (next.profile !== config.profile || next.selfId !== config.selfId)
        throw new Error('账号信息需通过关联账号更新');
      await stop();
      await writeJsonAtomic(configPath, next);
      config = next;
      await start();
      return snapshot();
    }
    throw new Error('未知操作');
  }
  await start();
  return {
    snapshot,
    dispatch,
    dispose: async () => {
      closing = true;
      await stop();
    },
  };
}
