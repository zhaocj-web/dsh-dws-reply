import type { ContactSearchResult } from '../../shared/types';
import { runDws } from './command';

type ContactResponse = {
  result: Array<{
    name?: string;
    nick?: string;
    userId?: string;
    title?: string;
    openDingTalkId?: string;
  }>;
};

/** 名单需要开放 ID；禁止用企业 userId 或昵称替代消息目标。 */
export function projectContacts(response: ContactResponse): ContactSearchResult {
  if (!Array.isArray(response.result)) throw new Error('联系人搜索返回格式异常');
  const contacts: ContactSearchResult['contacts'] = [];
  const seen = new Set<string>();
  let omitted = 0;
  for (const item of response.result) {
    if (!item || typeof item.openDingTalkId !== 'string' || !item.openDingTalkId.trim()) {
      omitted++;
      continue;
    }
    if (seen.has(item.openDingTalkId)) continue;
    seen.add(item.openDingTalkId);
    contacts.push({
      openDingTalkId: item.openDingTalkId,
      nickname: typeof item.nick === 'string' ? item.nick : '',
      realName: typeof item.name === 'string' ? item.name : '',
      position: typeof item.title === 'string' ? item.title : '',
      name:
        (typeof item.name === 'string' && item.name) ||
        (typeof item.nick === 'string' && item.nick) ||
        '未提供姓名',
      detail: typeof item.title === 'string' ? item.title : '',
    });
  }
  return { contacts, omitted };
}

export async function searchContacts(
  profile: string,
  payload: unknown,
): Promise<ContactSearchResult> {
  if (!profile) throw new Error('请先在设置中关联钉钉账号');
  const query =
    typeof payload === 'object' && payload !== null && 'query' in payload
      ? payload.query
      : undefined;
  if (typeof query !== 'string' || !query.trim() || query.length > 100) {
    throw new Error('请输入 1～100 字的钉钉昵称或姓名');
  }
  const response = await runDws<ContactResponse>([
    'contact',
    'user',
    'search',
    '--query',
    query.trim(),
    '--profile',
    profile,
    '--format',
    'json',
  ]);
  const projected = projectContacts(response);
  const userIds = [
    ...new Set(
      response.result
        .map((item) => item?.userId)
        .filter((id): id is string => typeof id === 'string' && !!id),
    ),
  ];
  if (userIds.length > 30) throw new Error('搜索结果过多，请输入更完整的昵称或姓名后重试');
  if (userIds.length > 0) {
    const details = await runDws<ContactDetailsResponse>([
      'contact',
      'user',
      'get',
      '--ids',
      userIds.join(','),
      '--profile',
      profile,
      '--format',
      'json',
    ]);
    enrichContactProfiles(projected.contacts, response, details);
  }
  return projected;
}

type ContactDetailsResponse = {
  result: Array<{
    orgEmployeeModel?: {
      orgUserId?: string;
      orgUserName?: string;
      orgName?: string;
      orgTitle?: string;
      depts?: Array<{ deptName?: string }>;
    };
  }>;
};

/** 只按相同企业用户 ID 关联详情；好友缺少 userId 时不借用同名员工的资料。 */
export function enrichContactProfiles(
  contacts: ContactSearchResult['contacts'],
  response: ContactResponse,
  details: ContactDetailsResponse,
): void {
  if (!Array.isArray(details.result)) throw new Error('无法读取联系人公司信息，请核对后重试');
  for (const contact of contacts) {
    const userId = response.result.find(
      (item) => item?.openDingTalkId === contact.openDingTalkId,
    )?.userId;
    if (!userId) continue;
    const employee = details.result.find(
      (item) => item?.orgEmployeeModel?.orgUserId === userId,
    )?.orgEmployeeModel;
    if (!employee) continue;
    contact.company = typeof employee.orgName === 'string' ? employee.orgName : '';
    contact.realName =
      typeof employee.orgUserName === 'string' ? employee.orgUserName : contact.realName;
    contact.position = typeof employee.orgTitle === 'string' ? employee.orgTitle : contact.position;
    contact.department = Array.isArray(employee.depts)
      ? employee.depts
          .map((department) => department?.deptName)
          .filter((name) => typeof name === 'string')
          .join(' / ')
      : '';
    contact.detail = [contact.company, contact.department, contact.position]
      .filter(Boolean)
      .join(' · ');
  }
}
