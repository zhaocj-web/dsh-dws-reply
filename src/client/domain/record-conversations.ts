import type { ProcessingRecord, ReplyConfig } from '../../shared/types';

export type RecordConversation = {
  key: string;
  kind: ProcessingRecord['kind'];
  target: string;
  label: string;
  count: number;
};
type RecordConversationsParams = {
  records: ProcessingRecord[];
  config: ReplyConfig;
};

/** 类型参与会话键，避免同一个标识在私聊和群聊中串记录。 */
export function recordConversationKey(record: ProcessingRecord): string {
  return JSON.stringify([record.kind, record.kind === 'test' ? 'test' : record.target]);
}

/** 按最新记录的顺序生成会话列表；名称只用于展示，筛选始终使用稳定标识。 */
export function recordConversations(params: RecordConversationsParams): RecordConversation[] {
  const conversations = new Map<string, RecordConversation>();
  for (const record of params.records) {
    const key = recordConversationKey(record);
    const existing = conversations.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    const rule = params.config.conversationRules.find(
      (item) => item.kind === record.kind && item.targetId === record.target,
    );
    const contact = params.config.contactProfiles?.find(
      (item) => item.openDingTalkId === record.target,
    );
    const label =
      record.kind === 'test'
        ? '模型自检'
        : record.kind === 'direct'
          ? contact?.nickname ||
            contact?.name ||
            rule?.label ||
            (record.origin !== 'owner'
              ? record.sender
              : params.records.find(
                  (item) =>
                    item.kind === record.kind &&
                    item.target === record.target &&
                    item.origin !== 'owner',
                )?.sender) ||
            record.target
          : rule?.label ||
            params.config.groupProfiles?.find((group) => group.openConversationId === record.target)
              ?.name ||
            `群聊 ${record.target}`;
    conversations.set(key, {
      key,
      kind: record.kind,
      target: record.target,
      label,
      count: 1,
    });
  }
  return [...conversations.values()];
}
