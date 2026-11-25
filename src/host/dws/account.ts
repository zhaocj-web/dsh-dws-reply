import type { AccountDetails } from '../../shared/types';
import { runDws } from './command';
export interface AccountIdentity {
  profile: string;
  selfId: string;
  label: string;
  details: AccountDetails;
}
interface Profile {
  profile: string;
  corpId: string;
  userId: string;
  userName: string;
  corpName: string;
  isOrgCurrent?: boolean;
}
interface ProfilesResponse {
  profiles?: Profile[];
}
interface Employee {
  corpId: string;
  userId: string;
  openDingTalkId?: string;
  orgUserName?: string;
  orgName?: string;
  orgEmail?: string;
  depts?: Array<{ deptName?: string }>;
}
interface SelfResponse {
  result?: Array<{
    orgEmployeeModel?: Employee;
  }>;
}
export async function resolveAccount(profile?: string): Promise<AccountIdentity> {
  const profilesResponse = await runDws<ProfilesResponse>(['profile', 'list', '--format', 'json']);
  const list = profilesResponse.profiles || [];
  const matches = profile
    ? list.filter((entry) => entry.profile === profile)
    : list.filter((entry) => entry.isOrgCurrent === true);
  if (matches.length !== 1) throw new Error('无法确定唯一钉钉账号，请填写准确的 DWS profile');
  const selected = matches[0];
  const self = await runDws<SelfResponse>([
    'contact',
    'user',
    'get-self',
    '--profile',
    selected.profile,
    '--format',
    'json',
  ]);
  const identities = (self.result || [])
    .map((entry) => entry.orgEmployeeModel)
    .filter((entry) => entry?.corpId === selected.corpId && entry?.userId === selected.userId);
  if (identities.length !== 1 || !identities[0]?.openDingTalkId)
    throw new Error('无法核实个人开放 ID，请重新登录 DWS');
  const employee = identities[0]!;
  return {
    details: projectAccountDetails(employee),
    profile: selected.profile,
    selfId: identities[0]!.openDingTalkId!,
    label: `${selected.userName} · ${selected.corpName}`,
  };
}

/** 仅展示当前已核验组织的资料，不把员工姓名当作个人昵称。 */
export function projectAccountDetails(employee: Employee): AccountDetails {
  return {
    name: employee.orgUserName?.trim() || undefined,
    company: employee.orgName?.trim() || undefined,
    department:
      [
        ...new Set((employee.depts || []).map((dept) => dept.deptName?.trim()).filter(Boolean)),
      ].join('、') || undefined,
    email: employee.orgEmail?.trim() || undefined,
  };
}
