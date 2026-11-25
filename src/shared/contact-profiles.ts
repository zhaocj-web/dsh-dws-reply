import type { ContactCandidate } from './types';

/** 展示资料随名单保存，但消息权限始终只依据 directIds，移除名单时同步清理资料。 */
export function validateContactProfiles(input: unknown, selectedIds: string[]): ContactCandidate[] {
  if (!Array.isArray(input) || input.length > 200) throw new Error('联系人资料列表无效');
  const selected = new Set(selectedIds);
  const seen = new Set<string>();
  const result: ContactCandidate[] = [];
  for (const item of input) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.openDingTalkId !== 'string' ||
      !item.openDingTalkId.trim() ||
      item.openDingTalkId.length > 512
    ) {
      throw new Error('联系人资料缺少有效的开放 ID');
    }
    const openDingTalkId = item.openDingTalkId.trim();
    const contact: ContactCandidate = { openDingTalkId, name: '', detail: '' };
    for (const key of [
      'name',
      'detail',
      'nickname',
      'realName',
      'company',
      'department',
      'position',
    ] as const) {
      const value = item[key];
      if (value !== undefined && (typeof value !== 'string' || value.length > 2000))
        throw new Error('联系人资料字段无效');
      if (typeof value === 'string') contact[key] = value.trim();
    }
    if (!selected.has(openDingTalkId) || seen.has(openDingTalkId)) continue;
    seen.add(openDingTalkId);
    result.push(contact);
  }
  return result;
}
