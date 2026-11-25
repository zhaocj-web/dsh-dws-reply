import type { ConversationKind, ReplyConfig } from '../shared/types';
import type { PageId } from './types/routes';
export const tabs: Array<[PageId, string]> = [
  ['overview', '总览'],
  ['scope', '会话管理'],
  ['styles', '风格'],
  ['records', '处理记录'],
  ['knowledge', '知识库'],
];
export const labels: Record<string, string> = {
  disabled: '已关闭',
  starting: '正在连接',
  draft: '草稿模式',
  running: '自动代答中',
  error: '处理失败',
  delivered: '已送达',
  unknown: '投递状态未知',
  skipped: '已跳过',
  cancelled: '已取消',
};
export function describeReplyScope(config: ReplyConfig, kind: ConversationKind): string {
  const policy = config[`${kind}Policy`];
  if (policy === 'all') return kind === 'direct' ? '全部私聊' : '所有群里的 @我';
  if (policy === 'allowlist') return `指定名单 · ${config[`${kind}Ids`].length} 个`;
  return '关闭';
}
