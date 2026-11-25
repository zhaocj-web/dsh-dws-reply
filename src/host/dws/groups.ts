import type { GroupSearchResult } from '../../shared/types';
import { runDws } from './command';

type GroupResponse = {
  chats?: Array<{ openConversationId?: string; name?: string; title?: string }>;
  complete?: boolean;
  hasMore?: boolean;
  nextCursor?: string;
  stopReason?: string;
  failedCount?: number;
  failures?: unknown[];
};

/** 只接受群搜索返回的开放会话 ID；群名相同不合并，缺失 ID 的候选不允许加入名单。 */
export function projectGroups(response: GroupResponse): GroupSearchResult {
  if (!Array.isArray(response.chats)) throw new Error('群聊搜索返回格式异常');
  const groups: GroupSearchResult['groups'] = [];
  const seen = new Set<string>();
  let omitted = 0;
  for (const item of response.chats) {
    if (!item || typeof item.openConversationId !== 'string' || !item.openConversationId.trim()) {
      omitted++;
      continue;
    }
    const id = item.openConversationId.trim();
    if (seen.has(id)) continue;
    seen.add(id);
    groups.push({
      openConversationId: id,
      name:
        typeof item.name === 'string' && item.name.trim()
          ? item.name.trim()
          : typeof item.title === 'string'
            ? item.title.trim()
            : '',
    });
  }
  const failures = Array.isArray(response.failures) ? response.failures : [];
  const failedCount =
    typeof response.failedCount === 'number' ? response.failedCount : failures.length;
  return {
    groups,
    omitted,
    complete:
      response.complete === true &&
      response.hasMore === false &&
      failedCount === 0 &&
      failures.length === 0,
    hasMore: response.hasMore !== false,
    nextCursor: typeof response.nextCursor === 'string' ? response.nextCursor : '',
    stopReason: typeof response.stopReason === 'string' ? response.stopReason : '',
    failedCount,
    failures,
  };
}

/** 搜索有界翻页；没有读取完整结果时由页面提示缩小关键词范围，不隐瞒截断。 */
export async function searchGroups(profile: string, payload: unknown): Promise<GroupSearchResult> {
  if (!profile) throw new Error('请先在设置中关联钉钉账号');
  const query =
    typeof payload === 'object' && payload !== null && 'query' in payload
      ? payload.query
      : undefined;
  if (typeof query !== 'string' || !query.trim() || query.length > 100) {
    throw new Error('请输入 1～100 字的群名称关键词');
  }
  const response = await runDws<GroupResponse>([
    'chat',
    '+chat-search',
    '--query',
    query.trim(),
    '--limit',
    '50',
    '--page-all',
    '--page-limit',
    '2',
    '--profile',
    profile,
    '--format',
    'json',
  ]);
  return projectGroups(response);
}
