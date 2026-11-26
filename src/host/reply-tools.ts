import type { HostContext } from './contracts';
import type { ProcessingTrace } from '../shared/types';
import { createSkillTools } from './skills';
import { createWebSearch } from './web-search';
import type { ReplyTools } from './web-search';

type CreateReplyToolsParams = {
  context: HostContext;
  provider: string;
  signal: AbortSignal;
  onTrace?: (update: Partial<ProcessingTrace>) => void;
};

/** 按当前模型的实际服务能力组合工具，未知调用不会回退为任意宿主工具执行。 */
export async function createReplyTools(params: CreateReplyToolsParams): Promise<ReplyTools> {
  const [skills, web] = await Promise.all([
    createSkillTools(params),
    createWebSearch({ ...params, web: params.context.web }),
  ]);
  const groups = [skills, web];
  return {
    tools: groups.flatMap((group) => group.tools),
    prompt: groups.map((group) => group.prompt).join('\n'),
    execute: (call) => {
      const group = groups.find((group) => group.tools.some((tool) => tool.name === call.name));
      if (!group) return Promise.reject(new Error('本轮未启用此工具'));
      return group.execute(call);
    },
  };
}
