import type { PendingMessage, PendingStore } from './pending-store';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { traceTool } from './tool-trace';
import type { InternalChatParams } from './conversation-chat';
import { createProcessingTrace } from './processing-trace';
import { UnsupportedMessageError } from './unsupported-message';
import {
  resolveReplyRules,
  resolveConversationModel,
  resolveConversationStyle,
} from '../shared/conversation-rules';
import { errorMessage } from '../shared/errors';
import type {
  GenerateReply,
  ConversationRuleUpdate,
  HistoryTurn,
  Ledger,
  MessageEvent,
  ProcessingRecord,
  ReplyConfig,
  ReplyStatus,
  ReplyTarget,
} from '../shared/types';
import { deliveryStatus, eligible, type DeliveryReceipt } from './dws/message-policy';
export interface ProcessorDependencies {
  getConfig: () => ReplyConfig;
  pendingStore?: PendingStore;
  flushRecords?: () => Promise<void>;
  verifyOwnerSend?: () => Promise<void>;
  saveRules?: (params: ConversationRuleUpdate) => Promise<void>;
  getHistory?: (kind: 'direct' | 'group', target: string, conversationId?: string) => HistoryTurn[];
  saveLedger: (ledger: Ledger) => Promise<void>;
  ledger?: Ledger;
  generate: GenerateReply;
  send: (
    config: ReplyConfig,
    target: ReplyTarget,
    text: string,
    signal: AbortSignal,
  ) => Promise<DeliveryReceipt>;
  report: (record: ProcessingRecord) => void;
  signal: AbortSignal;
}
/** 串行处理事件，在调用模型前持久化去重标识，防止重启后重复发送。 */
export class Processor {
  private getConfig: ProcessorDependencies['getConfig'];
  private pendingStore?: PendingStore;
  private flushRecords?: () => Promise<void>;
  private saveRules: ProcessorDependencies['saveRules'];
  private getHistory: ProcessorDependencies['getHistory'];
  private activeReply?: { target: string; controller: AbortController };
  private interventions = new Set<string>();
  private saveLedger: ProcessorDependencies['saveLedger'];
  private ledger: Ledger;
  private generate: GenerateReply;
  private send: ProcessorDependencies['send'];
  private verifyOwnerSend: ProcessorDependencies['verifyOwnerSend'];
  private report: ProcessorDependencies['report'];
  private signal: AbortSignal;
  queue: Promise<void>;
  private pending: number;
  private queued = new Map<string, Promise<void>>();
  private history: Map<string, HistoryTurn[]>;
  private last: Map<string, number>;
  constructor(params: ProcessorDependencies) {
    this.getConfig = params.getConfig;
    this.pendingStore = params.pendingStore;
    this.flushRecords = params.flushRecords;
    this.saveRules = params.saveRules;
    this.getHistory = params.getHistory;
    this.saveLedger = params.saveLedger;
    this.ledger = params.ledger ?? {};
    this.generate = params.generate;
    this.send = params.send;
    this.verifyOwnerSend = params.verifyOwnerSend;
    this.report = params.report;
    this.signal = params.signal;
    this.queue = Promise.resolve();
    this.pending = 0;
    this.history = new Map();
    this.last = new Map();
  }
  accept(event: MessageEvent, receivedAt = Date.now()): Promise<void> {
    const target = eligible(event, this.getConfig(), receivedAt);
    if (!target || this.signal.aborted || this.ledger[target.key]) return Promise.resolve();
    const existing = this.queued.get(target.key);
    if (existing) return existing;
    if (!this.pendingStore && this.pending >= 50) {
      this.report({
        time: new Date(receivedAt).toISOString(),
        kind: target.kind,
        target: target.target,
        sender: event.sender || target.target,
        input: event.content,
        conversationId: target.conversation,
        status: 'error',
        error: '待处理消息已达 50 条，本条未入队、未回复，请在会话中手动处理',
      });
      return Promise.resolve();
    }
    this.pending++;
    // 立即排入磁盘写入队列，不等待前一条模型回复完成。
    const persisted =
      this.pendingStore?.add({ key: target.key, event, receivedAt }) ?? Promise.resolve();
    void persisted.catch(() => {});
    const task = this.queue.then(async () => {
      await persisted;
      await this.process(event, receivedAt, target.key);
      const status = this.ledger[target.key]?.status;
      if (
        (status && ['delivered', 'draft', 'skipped', 'unknown'].includes(status)) ||
        (status === 'cancelled' && !this.signal.aborted)
      ) {
        await this.flushRecords?.();
        await this.pendingStore?.remove(target.key);
      }
    });
    const settled = task.finally(() => {
      this.pending--;
      this.queued.delete(target.key);
    });
    this.queued.set(target.key, settled);
    this.queue = settled.catch(() => {});
    return settled;
  }
  /** 仅恢复有原始来信且明确未提交发送的任务；sending 永不猜测为失败重发。 */
  async restore(onFailure: (error: unknown) => void): Promise<void> {
    const recovered: PendingMessage[] = [];
    for (const entry of this.pendingStore?.entries ?? []) {
      if (this.signal.aborted) return;
      const target = eligible(entry.event, this.getConfig(), entry.receivedAt);
      if (!target || target.key !== entry.key) continue;
      const status = this.ledger[entry.key]?.status;
      if (status === 'sending') {
        this.report({
          time: new Date().toISOString(),
          kind: target.kind,
          target: target.target,
          sender: entry.event.sender || target.target,
          input: entry.event.content,
          conversationId: target.conversation,
          status: 'unknown',
          error: '上次运行在提交发送后中断，投递结果未知，不会自动重发，请核实钉钉会话',
        });
        await this.flushRecords?.();
        this.ledger[entry.key] = { time: Date.now(), status: 'unknown' };
        await this.saveLedger(this.ledger);
      }
      if (status && !['processing', 'error', 'cancelled'].includes(status)) {
        await this.pendingStore?.remove(entry.key);
        continue;
      }
      delete this.ledger[entry.key];
      recovered.push(entry);
    }
    await this.saveLedger(this.ledger);
    for (const entry of recovered) {
      void this.accept(entry.event, entry.receivedAt).catch(onFailure);
    }
  }
  /** 内部交流与自动代答共用队列；取消仍在生成的同会话回复，但不撤回已提交的消息。 */
  chat(params: InternalChatParams): Promise<void> {
    const key = JSON.stringify([params.kind, params.target]);
    this.interventions.add(key);
    if (this.activeReply?.target === key) this.activeReply.controller.abort();
    const task = this.queue.then(async () => {
      const config = this.getConfig();
      const history = this.getHistory?.(params.kind, params.target, params.conversationId) ?? [];
      const trace = createProcessingTrace(history.length);
      trace.update({ steps: ['账号主人内部交流，不发送给联系人'] });
      const record = {
        time: new Date().toISOString(),
        kind: params.kind,
        target: params.target,
        sender: '我',
        input: params.text,
        origin: 'owner' as const,
        conversationId: params.conversationId,
        requestId: params.requestId,
      };
      const target = {
        kind: params.kind,
        target: params.target,
        conversation: params.target,
        key: params.requestId,
      };
      let sentText: string | undefined;
      let attemptedSend = false;
      const sendKey = createHash('sha256')
        .update(
          JSON.stringify([
            config.profile,
            params.kind,
            params.target,
            params.requestId,
            'owner-send',
          ]),
        )
        .digest('hex');
      try {
        this.signal.throwIfAborted();
        let proposedRules: string | undefined;
        const previousRules =
          config.conversationRules.find(
            (rule) => rule.kind === params.kind && rule.targetId === params.target,
          )?.rules ?? '';
        let answer = await this.generate(
          params.text,
          history,
          {
            ...config,
            rules: resolveReplyRules(config, target),
            replyModel: resolveConversationModel(config, target),
            activeStyleId: resolveConversationStyle(config, target),
          },
          this.signal,
          JSON.stringify([config.profile, params.kind, params.conversationId ?? params.target]),
          undefined,
          trace.update,
          'owner',
          {
            currentRules: previousRules,
            onSendProposal: (text) => {
              sentText = text;
            },
            onProposal: (rules) => {
              proposedRules = rules;
            },
          },
        );
        this.signal.throwIfAborted();
        if (proposedRules !== undefined && proposedRules !== previousRules) {
          if (!this.saveRules) throw new Error('规则保存服务不可用，未保存修改');
          await this.saveRules({ kind: params.kind, target: params.target, rules: proposedRules });
          trace.update({
            ruleChange: { before: previousRules, after: proposedRules },
            steps: ['当前会话回复规则已保存并生效'],
          });
          answer += '\n\n已保存到当前会话的回复规则。';
        }
        let status: ReplyStatus = 'draft';
        if (sentText) {
          if (
            !sentText.trim() ||
            sentText.length > config.maxReplyChars ||
            sentText.trim() === '[[SKIP]]'
          )
            throw new Error('发送正文为空或超过字数上限，未发送');
          if (this.ledger[sendKey])
            throw new Error('此请求已有发送记录，请查看原记录，不会重复发送');
          this.signal.throwIfAborted();
          await this.verifyOwnerSend?.();
          this.signal.throwIfAborted();
          this.ledger[sendKey] = { time: Date.now(), status: 'sending' };
          await this.saveLedger(this.ledger);
          attemptedSend = true;
          const receipt = await traceTool({
            tool: 'DWS · chat +messages-send',
            purpose: '按主人明确指令发送到当前会话',
            signal: this.signal,
            onTrace: trace.update,
            run: () => this.send(config, { ...target, key: sendKey }, sentText!, this.signal),
            summarize: (result) =>
              deliveryStatus(result) === 'delivered' ? '已确认送达' : '投递状态未知，未重发',
          });
          status = deliveryStatus(receipt);
          this.ledger[sendKey] = { time: Date.now(), status };
          await this.saveLedger(this.ledger);
          answer +=
            status === 'delivered'
              ? '\n\n已发送到当前会话，钉钉已确认送达。'
              : '\n\n已提交发送，但未确认送达，不会自动重发。';
        }
        this.report({
          ...record,
          status,
          answer,
          ...(attemptedSend ? { sentText } : {}),
          trace: trace.finish(),
        });
      } catch (error) {
        this.report({
          ...record,
          status: attemptedSend ? 'unknown' : this.signal.aborted ? 'cancelled' : 'error',
          ...(attemptedSend ? { sentText } : {}),
          error: attemptedSend
            ? `发送结果未知，不会自动重发：${errorMessage(error)}`
            : errorMessage(error),
          trace: trace.finish(),
        });
      } finally {
        this.interventions.delete(key);
      }
    });
    this.queue = task.catch(() => {});
    return task;
  }
  private async process(
    event: MessageEvent,
    receivedAt: number,
    expectedKey: string,
  ): Promise<void> {
    const config = this.getConfig();
    // 时效以入队时间为准；执行时仍重新核验当前账号和名单。
    const target = eligible(event, config, receivedAt);
    if (!target || target.key !== expectedKey || this.signal.aborted || this.ledger[target.key])
      return;
    const conversationScope = JSON.stringify([config.profile, target.kind, target.conversation]);
    const interventionKey = JSON.stringify([target.kind, target.target]);
    if (this.interventions.has(interventionKey)) {
      this.ledger[target.key] = { time: Date.now(), status: 'skipped' };
      this.report({
        time: new Date().toISOString(),
        kind: target.kind,
        target: target.target,
        sender: event.sender || target.target,
        input: event.content,
        status: 'skipped',
        error: '账号主人正在干预此会话，未自动回复',
      });
      await this.flushRecords?.();
      await this.saveLedger(this.ledger);
      return;
    }
    const waitMs =
      config.cooldownSeconds * 1000 - (Date.now() - (this.last.get(conversationScope) || 0));
    if (waitMs > 0) {
      try {
        await delay(waitMs, undefined, { signal: this.signal });
      } catch (error) {
        if (this.signal.aborted) return;
        throw error;
      }
      const currentTarget = eligible(event, this.getConfig(), receivedAt);
      if (currentTarget?.key !== expectedKey || this.interventions.has(interventionKey)) return;
    }
    this.ledger[target.key] = { time: Date.now(), status: 'processing' };
    await this.saveLedger(this.ledger); // 先落盘再调用模型：磁盘失败时停止，避免重启后重复发送。
    this.last.set(conversationScope, Date.now());
    const record = {
      time: new Date().toISOString(),
      kind: target.kind,
      sender: event.sender || event.sender_open_dingtalk_id!,
      target: target.target,
      input: event.content,
      conversationId: target.conversation,
    };
    const history =
      this.getHistory?.(target.kind, target.target, target.conversation) ??
      this.history.get(conversationScope) ??
      [];
    const replyController = new AbortController();
    const replySignal = AbortSignal.any([this.signal, replyController.signal]);
    this.activeReply = { target: interventionKey, controller: replyController };
    const trace = createProcessingTrace(history.length);
    trace.update({ steps: ['命中回复范围，已通过去重检查'] });
    let attemptedSend = false;
    const report = (result: ProcessingRecord) => this.report({ ...result, trace: trace.finish() });
    try {
      const answer = (
        await this.generate(
          event.content!,
          history,
          {
            ...config,
            rules: resolveReplyRules(config, target),
            replyModel: resolveConversationModel(config, target),
            activeStyleId: resolveConversationStyle(config, target),
          },
          replySignal,
          conversationScope,
          event,
          trace.update,
        )
      ).trim();
      replySignal.throwIfAborted();
      if (!answer || answer === '[[SKIP]]') {
        this.ledger[target.key].status = 'skipped';
        report({
          ...record,
          status: 'skipped',
          error: answer === '[[SKIP]]' ? '模型根据回复规则选择跳过' : '模型未生成回复内容',
        });
        return;
      }
      if (answer.length > config.maxReplyChars) throw new Error('回复过长，已停止发送');
      let status: ReplyStatus = 'draft';
      if (config.mode === 'auto') {
        if (eligible(event, this.getConfig(), receivedAt)?.key !== expectedKey) return;
        replySignal.throwIfAborted();
        this.ledger[target.key].status = 'sending';
        await this.saveLedger(this.ledger);
        replySignal.throwIfAborted();
        attemptedSend = true;
        trace.update({ steps: ['提交钉钉发送'] });
        const receipt = await traceTool({
          tool: 'DWS · chat +messages-send',
          purpose: '发送回复并查询送达回执',
          run: () => this.send(config, target, answer, this.signal),
          onTrace: trace.update,
          signal: this.signal,
          summarize: (result) =>
            deliveryStatus(result) === 'delivered' ? '已确认送达' : '投递状态未知，未重发',
        });
        status = deliveryStatus(receipt);
      }
      this.ledger[target.key].status = status;
      if (status === 'delivered') {
        this.history.set(
          conversationScope,
          [...history, { user: event.content!, assistant: answer }].slice(-config.historyTurns),
        );
        if (config.historyTurns === 0) this.history.delete(conversationScope);
        if (this.history.size > 100) this.history.delete(this.history.keys().next().value!);
      }
      trace.update({
        steps: [
          status === 'delivered'
            ? '钉钉已确认送达'
            : status === 'draft'
              ? '已生成草稿，未发送'
              : '未确认送达，不自动重发',
        ],
      });
      report({ ...record, status, answer });
    } catch (error) {
      const status = attemptedSend
        ? 'unknown'
        : replySignal.aborted
          ? 'cancelled'
          : error instanceof UnsupportedMessageError
            ? 'skipped'
            : 'error';
      // 主人主动干预属于终止任务，不能在下次恢复时再次自动回复。
      this.ledger[target.key].status =
        !attemptedSend && replyController.signal.aborted ? 'skipped' : status;
      report({
        ...record,
        status,
        error: attemptedSend
          ? `发送结果未知，不会自动重发：${errorMessage(error)}`
          : replyController.signal.aborted
            ? '账号主人已干预，取消本次自动回复'
            : errorMessage(error),
      });
    } finally {
      this.activeReply = undefined;
      await this.flushRecords?.();
      await this.saveLedger(this.ledger);
    }
  }
}
