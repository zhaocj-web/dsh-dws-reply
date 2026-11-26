import type { KnowledgeConfig, KnowledgeReference, KnowledgeRequest } from './knowledge';
/** 持久化配置。字段名保持稳定，以兼容已安装版本的数据。 */
export interface ReplyConfig {
  knowledge: KnowledgeConfig;
  activeStyleId: string | null;
  replyStyles: ReplyStyle[];
  enabled: boolean;
  mode: 'draft' | 'auto';
  replyModel: ReplyModel | null;
  profile: string;
  selfId: string;
  directPolicy: ReplyPolicy;
  directIds: string[];
  contactProfiles: ContactCandidate[];
  groupPolicy: ReplyPolicy;
  groupIds: string[];
  groupProfiles: GroupCandidate[];
  /** 所有会话共用，保留旧字段以兼容已有配置。 */
  rules: string;
  conversationRules: ConversationRule[];
  maxAgeSeconds: number;
  maxReplyChars: number;
  cooldownSeconds: number;
  historyTurns: number;
}
/** 私聊按对方 ID，群聊按群会话 ID 匹配；备注只用于界面展示。 */
export interface ConversationRule {
  styleId?: string | null;
  replyModel?: ReplyModel | null;
  kind: ConversationKind;
  targetId: string;
  label: string;
  rules: string;
}
export type ReplyPolicy = 'off' | 'allowlist' | 'all';
export type ConversationKind = 'direct' | 'group';
export type ReplyStatus = 'draft' | 'delivered' | 'unknown' | 'skipped' | 'cancelled' | 'error';
export type RuntimePhase = 'disabled' | 'starting' | 'draft' | 'running' | 'error';
/** DWS 扁平事件；边界校验允许缺失字段，业务层必须先筛选。 */
export interface MessageEvent {
  type?: string;
  message_id?: string;
  conversation_id?: string;
  sender_open_dingtalk_id?: string;
  sender?: string;
  content?: string;
  event_time?: number;
  timestamp?: number;
  create_time?: string;
}
export interface ReplyTarget {
  kind: ConversationKind;
  target: string;
  conversation: string;
  key: string;
}
export interface HistoryTurn {
  sentText?: string;
  origin?: 'owner' | 'incoming';
  user: string;
  assistant: string;
}
export type ToolCallRecord = {
  id?: string;
  tool: string;
  purpose: string;
  time: string;
  durationMs: number;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  result: string;
};
export type ProcessingTrace = {
  partialAnswer?: string;
  ruleChange?: { before: string; after: string };
  knowledgeReferences?: KnowledgeReference[];
  toolCalls?: ToolCallRecord[];
  model?: ReplyModel;
  historyTurns: number;
  imageCount?: number;
  durationMs: number;
  steps: string[];
  reasoning?: string;
  reasoningTruncated?: boolean;
};
export type MessageImagesResult = { images: Array<{ id: string; dataUrl: string }> };
export interface ProcessingRecord {
  inProgress?: boolean;
  messageId?: string;
  senderId?: string;
  sentText?: string;
  conversationId?: string;
  origin?: 'owner' | 'incoming';
  requestId?: string;
  input?: string;
  trace?: ProcessingTrace;
  time: string;
  kind: ConversationKind | 'test';
  sender: string;
  target: string;
  status: ReplyStatus;
  answer?: string;
  error?: string;
}
export type Ledger = Record<
  string,
  {
    time: number;
    status: ReplyStatus | 'processing' | 'sending';
  }
>;
export type AccountDetails = {
  name?: string;
  company?: string;
  department?: string;
  email?: string;
};
export interface RuntimeState {
  phase: RuntimePhase;
  streams: Record<string, 'connecting' | 'ready' | 'stopped'>;
  records: ProcessingRecord[];
  activeRecords?: ProcessingRecord[];
  error: string;
  account: string;
  accountDetails?: AccountDetails;
}
export interface PluginSnapshot {
  config: ReplyConfig;
  state: RuntimeState;
  configPath: string;
}
export interface ContactCandidate {
  nickname?: string;
  realName?: string;
  company?: string;
  department?: string;
  position?: string;
  openDingTalkId: string;
  name: string;
  detail: string;
}
export interface ContactSearchResult {
  contacts: ContactCandidate[];
  omitted: number;
}
export interface RpcRequests {
  sendDraft: { kind: ConversationKind; target: string; time: string };
  messageImages: { kind: ConversationKind; target: string; time: string };
  knowledge: KnowledgeRequest;
  internalChat: { kind: ConversationKind; target: string; text: string; requestId: string };
  listContacts: { cursor?: string };
  listGroups: { cursor?: string };
  listModels: undefined;
  refreshAccount: undefined;
  openConfigDirectory: undefined;
  searchGroups: { query: string };
  searchContacts: { query: string };
  get: undefined;
  test: undefined;
  connect: {
    profile: string;
  };
  save: ReplyConfig;
}
export type Endpoint = keyof RpcRequests;
export type RpcResult<T = PluginSnapshot> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: {
        message: string;
      };
    };
export interface RpcClient {
  call<T = PluginSnapshot>(
    channel: string,
    method: string,
    payload?: unknown,
  ): Promise<RpcResult<T>>;
}
export type InternalRuleContext = {
  currentRules: string;
  onSendProposal?: (text: string) => void;
  onProposal: (rules: string) => void;
};
export type ConversationRuleUpdate = { kind: ConversationKind; target: string; rules: string };
export type GenerateReply = (
  text: string,
  history: HistoryTurn[],
  config: ReplyConfig,
  signal: AbortSignal,
  scope: string,
  event?: MessageEvent,
  onTrace?: (update: Partial<ProcessingTrace>) => void,
  origin?: 'owner' | 'incoming',
  ruleContext?: InternalRuleContext,
) => Promise<string>;

export type GroupCandidate = {
  openConversationId: string;
  name: string;
};
export type GroupSearchResult = {
  groups: GroupCandidate[];
  omitted: number;
  complete: boolean;
  hasMore: boolean;
  nextCursor: string;
  stopReason: string;
  failedCount: number;
  failures: unknown[];
};

export type ReplyModel = { provider: string; model: string };
export type ModelCatalog = {
  models: Array<ReplyModel & { name: string; providerName: string; supportsImages?: boolean }>;
  failedProviders: string[];
};

export type DirectoryPage<Item> = {
  items: Item[];
  omitted: number;
  hasMore: boolean;
  cursor?: string;
  notice?: string;
};
export type DirectoryResult = DirectoryPage<ContactCandidate> | DirectoryPage<GroupCandidate>;

export type ReplyStyle = {
  id: string;
  name: string;
  icon: string;
  category: string;
  summary: string;
  instructions: string;
  sample: string;
};
