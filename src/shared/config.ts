import { validateKnowledge } from './knowledge';
import { presetReplyStyles, validateReplyStyles } from './reply-styles';
import { validateGroupProfiles } from './group-profiles';
import { validateContactProfiles } from './contact-profiles';
import { validateConversationRules } from './conversation-rules';
import type { ReplyConfig } from './types';
export const defaults: ReplyConfig = {
  knowledge: { enabled: false, documents: [] },
  activeStyleId: null,
  replyStyles: [],
  enabled: false,
  mode: 'draft',
  replyModel: null,
  profile: '',
  selfId: '',
  directPolicy: 'off',
  directIds: [],
  contactProfiles: [],
  groupPolicy: 'off',
  groupIds: [],
  groupProfiles: [],
  rules:
    '使用简短自然的中文回复。只依据对方消息和当前会话上下文回答；不清楚的事实明确说不确定。不要编造我的经历、进度或承诺。不确定如何回复时只输出 [[SKIP]]。',
  conversationRules: [],
  maxAgeSeconds: 120,
  maxReplyChars: 1500,
  cooldownSeconds: 10,
  historyTurns: 6,
};
/** 加载配置和保存配置共用同一校验，避免 UI 限制与后台规则不一致。 */
export function validate(input: Partial<ReplyConfig>): ReplyConfig {
  const config = { ...defaults, ...input };
  config.knowledge = validateKnowledge(config.knowledge);
  config.replyStyles = validateReplyStyles(config.replyStyles);
  if (
    config.activeStyleId !== null &&
    (typeof config.activeStyleId !== 'string' ||
      ![...presetReplyStyles, ...config.replyStyles].some(
        (style) => style.id === config.activeStyleId,
      ))
  )
    throw new Error('请选择有效的回复风格');
  if (config.replyModel !== null) {
    const selection = config.replyModel;
    if (
      !selection ||
      typeof selection !== 'object' ||
      typeof selection.provider !== 'string' ||
      !selection.provider.trim() ||
      selection.provider.length > 512 ||
      typeof selection.model !== 'string' ||
      !selection.model.trim() ||
      selection.model.length > 512
    ) {
      throw new Error('回复模型配置无效');
    }
    config.replyModel = { provider: selection.provider.trim(), model: selection.model.trim() };
  }
  config.conversationRules = validateConversationRules(config.conversationRules);
  const styleIds = new Set([...presetReplyStyles, ...config.replyStyles].map((style) => style.id));
  if (config.conversationRules.some((rule) => rule.styleId && !styleIds.has(rule.styleId)))
    throw new Error('会话规则选择的风格不存在');
  for (const k of Object.keys(config)) if (!(k in defaults)) throw new Error(`未知配置项：${k}`);
  if (typeof config.enabled !== 'boolean') throw new Error('启用状态无效');
  if (!['draft', 'auto'].includes(config.mode)) throw new Error('模式无效');
  for (const k of ['directPolicy', 'groupPolicy'] as const)
    if (!['off', 'allowlist', 'all'].includes(config[k])) throw new Error('回复范围无效');
  for (const k of ['profile', 'selfId', 'rules'] as const)
    if (typeof config[k] !== 'string' || config[k].length > 12000)
      throw new Error(`配置无效：${k}`);
  for (const k of ['directIds', 'groupIds'] as const) {
    if (
      !Array.isArray(config[k]) ||
      config[k].length > 200 ||
      config[k].some((x) => typeof x !== 'string' || !x.trim() || x.length > 512)
    )
      throw new Error(`名单无效：${k}`);
    config[k] = [...new Set(config[k].map((x) => x.trim()))];
  }
  config.groupProfiles = validateGroupProfiles(config.groupProfiles, config.groupIds);
  config.contactProfiles = validateContactProfiles(config.contactProfiles, config.directIds);
  for (const [k, lo, hi] of [
    ['maxAgeSeconds', 10, 600],
    ['maxReplyChars', 50, 4000],
    ['cooldownSeconds', 0, 3600],
    ['historyTurns', 0, 20],
  ] as const)
    if (!Number.isInteger(config[k]) || config[k] < lo || config[k] > hi)
      throw new Error(`配置超出范围：${k}`);
  if (config.enabled && (!config.profile || !config.selfId)) throw new Error('请先关联钉钉账号');
  if (config.enabled && config.directPolicy === 'off' && config.groupPolicy === 'off')
    throw new Error('请选择至少一种回复范围');
  for (const [policy, ids] of [
    ['directPolicy', 'directIds'],
    ['groupPolicy', 'groupIds'],
  ] as const)
    if (config.enabled && config[policy] === 'allowlist' && !config[ids].length)
      throw new Error('指定名单不能为空');
  return config;
}
