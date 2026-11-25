import type { ContactCandidate, DirectoryPage, GroupCandidate } from '../../shared/types';
import { runDws } from './command';

type FriendResponse = {
  data: {
    friends: Array<{ openDingTalkId?: string; nick?: string; alias?: string }>;
    cursor: number;
    hasMore: boolean;
  };
};
type JoinedGroupResponse = {
  groups: Array<{ conversationId?: string; name?: string }>;
  nextCursor: number | string;
  hasMore: boolean;
  complete: boolean;
  stopReason?: string;
  failures?: unknown[];
};

/** 分页游标仅作为独立 argv 传递；好友接口要求非负整数。 */
function readCursor(payload: unknown, numeric: boolean): string | undefined {
  if (payload === undefined) return undefined;
  if (!payload || typeof payload !== 'object') throw new Error('列表分页参数无效');
  const cursor = 'cursor' in payload ? payload.cursor : undefined;
  if (cursor === undefined) return undefined;
  if (
    typeof cursor !== 'string' ||
    !cursor ||
    cursor.length > 512 ||
    (numeric && !/^\d+$/.test(cursor))
  ) {
    throw new Error('列表分页游标无效');
  }
  return cursor;
}

export function projectFriends(response: FriendResponse): DirectoryPage<ContactCandidate> {
  const data = response.data;
  if (!data || !Array.isArray(data.friends) || typeof data.hasMore !== 'boolean') {
    throw new Error('好友列表返回格式异常');
  }
  const items = new Map<string, ContactCandidate>();
  let omitted = 0;
  for (const friend of data.friends) {
    const id = typeof friend?.openDingTalkId === 'string' ? friend.openDingTalkId.trim() : '';
    if (!id) {
      omitted++;
      continue;
    }
    const nickname = typeof friend.nick === 'string' ? friend.nick : '';
    const alias = typeof friend.alias === 'string' ? friend.alias : '';
    items.set(id, {
      openDingTalkId: id,
      nickname,
      name: nickname || alias || id,
      detail: alias && alias !== nickname ? `备注：${alias}` : '',
    });
  }
  if (data.hasMore && (!Number.isSafeInteger(data.cursor) || data.cursor < 0))
    throw new Error('好友列表缺少有效的下一页游标');
  return {
    items: [...items.values()],
    omitted,
    hasMore: data.hasMore,
    cursor: data.hasMore ? String(data.cursor) : undefined,
  };
}

/** +my-groups 的 conversationId 是实际返回的 cid，会话名称不参与去重。 */
export function projectJoinedGroups(response: JoinedGroupResponse): DirectoryPage<GroupCandidate> {
  if (!Array.isArray(response.groups) || typeof response.hasMore !== 'boolean')
    throw new Error('群聊列表返回格式异常');
  const items = new Map<string, GroupCandidate>();
  let omitted = 0;
  for (const group of response.groups) {
    const id = typeof group?.conversationId === 'string' ? group.conversationId.trim() : '';
    if (!id) {
      omitted++;
      continue;
    }
    items.set(id, {
      openConversationId: id,
      name: typeof group.name === 'string' ? group.name : '',
    });
  }
  const cursor =
    typeof response.nextCursor === 'string' || typeof response.nextCursor === 'number'
      ? String(response.nextCursor)
      : '';
  if (response.hasMore && !cursor) throw new Error('群聊列表缺少下一页游标');
  return {
    items: [...items.values()],
    omitted,
    hasMore: response.hasMore,
    cursor: response.hasMore ? cursor : undefined,
    notice:
      response.failures?.length || (!response.hasMore && response.complete !== true)
        ? `群聊列表尚未完整读取${response.stopReason ? `（${response.stopReason}）` : ''}`
        : undefined,
  };
}

export async function listContacts(
  profile: string,
  payload: unknown,
): Promise<DirectoryPage<ContactCandidate>> {
  if (!profile) throw new Error('请先在设置中关联钉钉账号');
  const cursor = readCursor(payload, true);
  const result = await runDws<FriendResponse>([
    'contact',
    '+friend-list',
    '--size',
    '50',
    ...(cursor ? ['--cursor', cursor] : []),
    '--profile',
    profile,
    '--format',
    'json',
  ]);
  const page = projectFriends(result);
  if (page.hasMore && page.cursor === cursor) throw new Error('好友列表分页未前进，请刷新后重试');
  return page;
}

export async function listGroups(
  profile: string,
  payload: unknown,
): Promise<DirectoryPage<GroupCandidate>> {
  if (!profile) throw new Error('请先在设置中关联钉钉账号');
  const cursor = readCursor(payload, false);
  const result = await runDws<JoinedGroupResponse>([
    'chat',
    '+my-groups',
    '--limit',
    '50',
    ...(cursor ? ['--cursor', cursor] : []),
    '--profile',
    profile,
    '--format',
    'json',
  ]);
  const page = projectJoinedGroups(result);
  if (page.hasMore && page.cursor === cursor) throw new Error('群聊列表分页未前进，请刷新后重试');
  return page;
}
