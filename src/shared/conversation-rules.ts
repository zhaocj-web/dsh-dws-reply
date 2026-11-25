import type { ConversationRule, ReplyConfig, ReplyTarget, ReplyModel } from './types';

/** 保存时严格校验并复制数据，防止重复目标导致匹配结果不明确。 */
export function validateConversationRules(input: unknown): ConversationRule[] {
  if (!Array.isArray(input) || input.length > 200) {
    throw new Error('会话规则必须是列表，最多支持 200 个会话');
  }
  const targets = new Set<string>();
  return input.map((item, index) => {
    const position = `第 ${index + 1} 条会话规则`;
    if (!item || typeof item !== 'object' || !['direct', 'group'].includes(item.kind)) {
      throw new Error(`${position}的会话类型无效`);
    }
    if (typeof item.targetId !== 'string' || !item.targetId.trim() || item.targetId.length > 512) {
      throw new Error(`${position}需要填写有效的目标 ID`);
    }
    if (typeof item.label !== 'string' || item.label.length > 100) {
      throw new Error(`${position}的备注不能超过 100 字`);
    }
    const styleId = item.styleId ?? null;
    if (
      styleId !== null &&
      (typeof styleId !== 'string' || !styleId.trim() || styleId.length > 100)
    )
      throw new Error(`${position}的风格无效`);
    const replyModel = item.replyModel == null ? null : validateRuleModel(item.replyModel);
    if (
      typeof item.rules !== 'string' ||
      (!item.rules.trim() && !replyModel && !styleId) ||
      item.rules.length > 12000
    ) {
      throw new Error(`${position}需要填写规则，且不能超过 12000 字`);
    }
    const targetId = item.targetId.trim();
    const key = JSON.stringify([item.kind, targetId]);
    if (targets.has(key)) throw new Error(`${position}的目标已存在，请合并为一条规则`);
    targets.add(key);
    return {
      kind: item.kind,
      targetId,
      label: item.label.trim(),
      rules: item.rules.trim(),
      ...(replyModel ? { replyModel } : {}),
      ...(styleId ? { styleId } : {}),
    };
  });
}

/** 只按已校验事件的目标匹配；规则不会扩大回复名单，也不会被聊天正文选中。 */
export function resolveReplyRules(config: ReplyConfig, target: ReplyTarget): string {
  const specific = config.conversationRules.find(
    (rule) => rule.kind === target.kind && rule.targetId === target.target,
  );
  if (!specific?.rules.trim()) return config.rules;
  return [
    '以下两层规则均由账号主人配置。先遵循全局公共规则，再应用当前会话专属规则；有冲突时，以会话专属规则为准。',
    '【全局公共回复规则】',
    config.rules,
    '【当前会话专属回复规则】',
    specific.rules,
  ].join('\n\n');
}

/** 模型覆盖与文字规则独立，按当前会话完整标识选择。 */
export function resolveConversationModel(
  config: ReplyConfig,
  target: ReplyTarget,
): ReplyModel | null {
  return (
    config.conversationRules.find(
      (rule) => rule.kind === target.kind && rule.targetId === target.target,
    )?.replyModel ?? config.replyModel
  );
}

function validateRuleModel(input: unknown): ReplyModel {
  if (
    !input ||
    typeof input !== 'object' ||
    !('provider' in input) ||
    !('model' in input) ||
    typeof input.provider !== 'string' ||
    !input.provider.trim() ||
    input.provider.length > 512 ||
    typeof input.model !== 'string' ||
    !input.model.trim() ||
    input.model.length > 512
  ) {
    throw new Error('会话回复模型配置无效');
  }
  return { provider: input.provider.trim(), model: input.model.trim() };
}

/** 未单独设置时继承全局风格，不受其他会话的选择影响。 */
export function resolveConversationStyle(config: ReplyConfig, target: ReplyTarget): string | null {
  return (
    config.conversationRules.find(
      (rule) => rule.kind === target.kind && rule.targetId === target.target,
    )?.styleId ?? config.activeStyleId
  );
}
