import type { KnowledgeRequest, KnowledgeResult } from '../../shared/knowledge';
import type { DirectoryPage, ContactCandidate, GroupCandidate } from '../../shared/types';
import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../../shared/errors';
import type {
  ContactSearchResult,
  GroupSearchResult,
  ModelCatalog,
  Endpoint,
  PluginSnapshot,
  ReplyConfig,
  RpcClient,
  RpcRequests,
} from '../../shared/types';
import type { PageId } from '../types/routes';
/** 服务端快照和编辑草稿分开维护：轮询状态时不覆盖用户正在编辑的内容。 */
export function useReplyWorkspace(rpc: RpcClient) {
  const [snapshot, setSnapshot] = useState<PluginSnapshot | null>(null);
  const [draftConfig, setDraftConfig] = useState<ReplyConfig | null>(null);
  const [page, setPage] = useState<PageId>('overview');
  const [filter, setFilter] = useState('all');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const listContacts = useCallback(
    async (cursor?: string): Promise<DirectoryPage<ContactCandidate>> => {
      const result = await rpc.call<DirectoryPage<ContactCandidate>>(
        '/api',
        'dws-personal.listContacts',
        { cursor },
      );
      if (!result.ok) throw Error(result.error.message);
      return result.value;
    },
    [rpc],
  );
  const listGroups = useCallback(
    async (cursor?: string): Promise<DirectoryPage<GroupCandidate>> => {
      const result = await rpc.call<DirectoryPage<GroupCandidate>>(
        '/api',
        'dws-personal.listGroups',
        { cursor },
      );
      if (!result.ok) throw Error(result.error.message);
      return result.value;
    },
    [rpc],
  );
  const queryKnowledge = useCallback(
    async (payload: KnowledgeRequest): Promise<KnowledgeResult> => {
      const result = await rpc.call<KnowledgeResult>('/api', 'dws-personal.knowledge', payload);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    [rpc],
  );
  const listModels = useCallback(async (): Promise<ModelCatalog> => {
    const result = await rpc.call<ModelCatalog>('/api', 'dws-personal.listModels');
    if (!result.ok) throw Error(result.error.message);
    return result.value;
  }, [rpc]);
  const searchGroups = useCallback(
    async (query: string): Promise<GroupSearchResult> => {
      const result = await rpc.call<GroupSearchResult>('/api', 'dws-personal.searchGroups', {
        query,
      });
      if (!result.ok) throw Error(result.error.message);
      return result.value;
    },
    [rpc],
  );
  const searchContacts = useCallback(
    async (query: string): Promise<ContactSearchResult> => {
      const result = await rpc.call<ContactSearchResult>('/api', 'dws-personal.searchContacts', {
        query,
      });
      if (!result.ok) throw Error(result.error.message);
      return result.value;
    },
    [rpc],
  );
  const call = async (endpoint: Endpoint, payload?: unknown): Promise<PluginSnapshot> => {
    const result = await rpc.call('/api', 'dws-personal.' + endpoint, payload);
    if (!result.ok) throw Error(result.error?.message || '操作失败');
    return result.value;
  };
  useEffect(() => {
    let alive = true;
    const load = () =>
      call('get')
        .then((result) => {
          if (alive) {
            setSnapshot(result);
            // 只在首次加载时初始化草稿，切页和轮询都保留本地修改。
            setDraftConfig((currentDraft) => currentDraft || result.config);
          }
        })
        .catch((error) => alive && setError(errorMessage(error)));
    load();
    const id = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [rpc]);
  const chatWithModel = async (payload: RpcRequests['internalChat']): Promise<void> => {
    const matches = (rule: ReplyConfig['conversationRules'][number]) =>
      rule.kind === payload.kind && rule.targetId === payload.target;
    const saved = snapshot?.config.conversationRules.find(matches);
    const draft = draftConfig?.conversationRules.find(matches);
    if (JSON.stringify(saved) !== JSON.stringify(draft))
      throw new Error('当前会话有未保存的规则，请先保存再与 AI 调整');
    setIsBusy(true);
    try {
      const result = await call('internalChat', payload);
      setSnapshot(result);
      setDraftConfig((current) => {
        if (!current) return result.config;
        const updated = result.config.conversationRules.find(matches);
        const remaining = current.conversationRules.filter((rule) => !matches(rule));
        return { ...current, conversationRules: updated ? [...remaining, updated] : remaining };
      });
    } finally {
      setIsBusy(false);
    }
  };
  const updateConfig = <K extends keyof ReplyConfig>(key: K, value: ReplyConfig[K]) => {
    setDraftConfig((currentDraft) =>
      currentDraft ? { ...currentDraft, [key]: value } : currentDraft,
    );
    setNotice('');
  };
  const performAction = async (endpoint: Endpoint, payload?: unknown): Promise<void> => {
    setIsBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await call(endpoint, payload);
      setSnapshot(result);
      if (endpoint === 'save') setDraftConfig(result.config);
      // 关联账号只更新身份字段；模型自检完全不改草稿。
      if (endpoint === 'connect')
        setDraftConfig((currentDraft) =>
          currentDraft
            ? { ...currentDraft, profile: result.config.profile, selfId: result.config.selfId }
            : currentDraft,
        );
      setNotice(
        endpoint === 'save'
          ? '设置已保存并生效'
          : endpoint === 'test'
            ? '模型自检完成，未向钉钉发送消息'
            : endpoint === 'openConfigDirectory'
              ? '已打开配置文件目录'
              : endpoint === 'refreshAccount'
                ? '账号资料已刷新'
                : '账号已关联',
      );
      if (endpoint === 'test') {
        setPage('records');
        setFilter('all');
      }
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };
  /** 启停只使用已保存的配置，保留页面中尚未保存的其他修改。 */
  const setRuntimeEnabled = async (enabled: boolean): Promise<void> => {
    if (!snapshot || isBusy) return;
    setIsBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await call('save', { ...snapshot.config, enabled });
      setSnapshot(result);
      setDraftConfig((current) =>
        current ? { ...current, enabled: result.config.enabled } : result.config,
      );
      setNotice(enabled ? '已按保存的设置启动代答' : '代答已停止');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setIsBusy(false);
    }
  };
  return {
    queryKnowledge,
    chatWithModel,
    setRuntimeEnabled,
    listContacts,
    listGroups,
    listModels,
    searchGroups,
    searchContacts,
    snapshot,
    draftConfig,
    page,
    filter,
    isBusy,
    error,
    notice,
    updateConfig,
    performAction,
    setPage,
    setFilter,
  };
}
