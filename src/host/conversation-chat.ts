import type { ConversationKind, HistoryTurn, ProcessingRecord } from '../shared/types';

export type InternalChatParams = {
  conversationId?: string;
  kind: ConversationKind;
  target: string;
  text: string;
  requestId: string;
};

export function validateInternalChat(payload: unknown): InternalChatParams {
  if (!payload || typeof payload !== 'object') throw new Error('会话请求无效');
  const value = payload as Record<string, unknown>;
  if (value.kind !== 'direct' && value.kind !== 'group') throw new Error('请选择联系人或群聊');
  for (const key of ['target', 'text', 'requestId']) {
    if (typeof value[key] !== 'string' || !value[key].trim())
      throw new Error('请输入有效的会话内容');
  }
  if (
    (value.text as string).length > 12000 ||
    (value.target as string).length > 512 ||
    (value.requestId as string).length > 100
  )
    throw new Error('会话内容过长');
  return {
    kind: value.kind,
    target: value.target as string,
    text: value.text as string,
    requestId: value.requestId as string,
  };
}

type ConversationHistoryParams = {
  conversationId?: string;
  records: ProcessingRecord[];
  kind: ConversationKind;
  target: string;
  limit: number;
};

/** 只恢复同一会话的有效对话；思考文本、失败与未知投递结果不进入上下文。 */
export function conversationHistory(params: ConversationHistoryParams): HistoryTurn[] {
  if (!params.limit) return [];
  return params.records
    .filter(
      (record) =>
        record.kind === params.kind &&
        (!params.conversationId ||
          !record.conversationId ||
          record.conversationId === params.conversationId) &&
        record.target === params.target &&
        record.input &&
        record.answer &&
        (record.status === 'delivered' || (record.origin === 'owner' && record.status === 'draft')),
    )
    .slice(0, params.limit)
    .reverse()
    .map((record) => ({
      user: record.input!,
      assistant: record.answer!,
      origin: record.origin,
      ...(record.sentText ? { sentText: record.sentText } : {}),
    }));
}
