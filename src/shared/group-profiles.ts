import type { GroupCandidate } from './types';

/** 群名称只供展示，代答范围始终以 groupIds 为准；保留旧配置中的手填 ID。 */
export function validateGroupProfiles(input: unknown, selectedIds: string[]): GroupCandidate[] {
  if (!Array.isArray(input) || input.length > 200) throw new Error('群聊资料列表无效');
  const selected = new Set(selectedIds);
  const seen = new Set<string>();
  const result: GroupCandidate[] = [];
  for (const item of input) {
    if (
      !item ||
      typeof item.openConversationId !== 'string' ||
      !item.openConversationId.trim() ||
      item.openConversationId.length > 512 ||
      typeof item.name !== 'string' ||
      item.name.length > 2000
    ) {
      throw new Error('群聊资料无效');
    }
    const id = item.openConversationId.trim();
    if (selected.has(id) && !seen.has(id)) {
      result.push({ openConversationId: id, name: item.name.trim() });
      seen.add(id);
    }
  }
  return result;
}
