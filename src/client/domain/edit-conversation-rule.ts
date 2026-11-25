import type { ConversationKind, ConversationRule, ReplyModel } from '../../shared/types';

type EditConversationRuleParams = {
  rules: ConversationRule[];
  kind: ConversationKind;
  targetId: string;
  value: string;
  replyModel?: ReplyModel | null;
  styleId?: string | null;
};

/** 保持旧规则的备注和其他会话不变，清空只移除当前会话的覆盖规则。 */
export function editConversationRule(params: EditConversationRuleParams): ConversationRule[] {
  const existing = params.rules.find(
    (rule) => rule.kind === params.kind && rule.targetId === params.targetId,
  );
  const remaining = params.rules.filter(
    (rule) => rule.kind !== params.kind || rule.targetId !== params.targetId,
  );
  const replyModel = params.replyModel === undefined ? existing?.replyModel : params.replyModel;
  const styleId = params.styleId === undefined ? existing?.styleId : params.styleId;
  if (!params.value.trim() && !replyModel && !styleId) return remaining;
  const next = {
    kind: params.kind,
    targetId: params.targetId,
    label: existing?.label || '',
    rules: params.value,
    ...(replyModel ? { replyModel } : {}),
    ...(styleId ? { styleId } : {}),
  };
  return existing
    ? params.rules.map((rule) => (rule === existing ? next : rule))
    : [...remaining, next];
}
