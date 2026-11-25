import type { ReplyConfig, ReplyStyle } from './types';

/** 预设只约束表达，不替用户补充事实、进度或承诺。 */
export const presetReplyStyles: ReplyStyle[] = [
  {
    id: 'concise',
    name: '简洁直接',
    icon: '✦',
    category: '日常',
    summary: '先说重点，少一点客套。',
    instructions: '优先用一至两句自然短句回答，先给结论，不重复对方的问题，避免长篇铺垫。',
    sample: '这部分我还不确定，需要先确认一下。',
  },
  {
    id: 'natural',
    name: '自然随和',
    icon: '☕',
    category: '日常',
    summary: '像平时聊天，轻松而有分寸。',
    instructions: '使用自然口语和简短句子，语气平和随和，避免客服套话、过度热情及不必要的表情。',
    sample: '你说的是哪一部分？再具体一点，我好理解。',
  },
  {
    id: 'professional',
    name: '专业清晰',
    icon: '▤',
    category: '工作',
    summary: '信息明确，表达有条理。',
    instructions:
      '用清晰、专业且简洁的中文回复；有多个要点时分点表达，区分已知信息和待确认事项，不推测进度。',
    sample: '目前还缺少具体时间和范围，麻烦补充一下。',
  },
  {
    id: 'collaborative',
    name: '友好协作',
    icon: '↗',
    category: '工作',
    summary: '先回应需求，再确认下一步。',
    instructions:
      '先简短回应对方的需求，再提出必要的澄清问题。语气友好平等，不代替账号主人承诺完成时间或承担任务。',
    sample: '明白你的意思了。这个需求里，你更希望优先处理哪部分？',
  },
  {
    id: 'warm',
    name: '温和耐心',
    icon: '☀',
    category: '日常',
    summary: '表达体贴，但不过度共情。',
    instructions:
      '语气温和耐心，回应对方明确表达的感受，避免夸大共情或套话；问题不清楚时温和询问。',
    sample: '听起来这件事让你有点困扰，愿意再说说具体情况吗？',
  },
  {
    id: 'formal',
    name: '正式礼貌',
    icon: '◇',
    category: '工作',
    summary: '措辞稳妥，保持沟通边界。',
    instructions:
      '使用礼貌、克制的书面表达，避免俚语和表情符号，不刻意使用冗长敬语，不作未经确认的承诺。',
    sample: '收到您的说明，请补充相关背景，便于进一步确认。',
  },
];

export function validateReplyStyles(value: unknown): ReplyStyle[] {
  if (!Array.isArray(value) || value.length > 50) throw new Error('自定义风格数量无效');
  const ids = new Set(presetReplyStyles.map((style) => style.id));
  return value.map((style) => {
    if (!style || typeof style !== 'object') throw new Error('风格配置无效');
    const limits = {
      id: 100,
      name: 40,
      icon: 16,
      category: 20,
      summary: 160,
      instructions: 4000,
      sample: 500,
    };
    for (const [key, limit] of Object.entries(limits)) {
      if (typeof style[key] !== 'string' || style[key].length > limit)
        throw new Error(`风格字段无效：${key}`);
    }
    if (!style.id.trim() || !style.name.trim() || !style.instructions.trim() || ids.has(style.id))
      throw new Error('风格名称、规则或标识无效');
    ids.add(style.id);
    return {
      id: style.id,
      name: style.name.trim(),
      icon: style.icon,
      category: '我的风格',
      summary: style.summary,
      instructions: style.instructions.trim(),
      sample: style.sample,
    };
  });
}

/** 风格在规则之前提供，明确公共规则和会话规则优先，且不改写原有规则文本。 */
export function resolveReplyInstructions(config: ReplyConfig): string {
  const style = [...presetReplyStyles, ...(config.replyStyles ?? [])].find(
    (item) => item.id === config.activeStyleId,
  );
  if (!style) return config.rules;
  return `表达风格：${style.name}\n${style.instructions}\n风格只影响表达方式；下方公共规则和会话专属规则优先，不得因风格编造事实或承诺。\n\n${config.rules}`;
}
