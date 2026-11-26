import { BlockAssembler, createToolResultMessage } from '@deepseek-ai/dsh-llm';
import type { GenerateOptions } from '@deepseek-ai/dsh-llm';
import type { HostContext } from './contracts';
import type { ReplyTools } from './web-search';

type RunSkillModelParams = {
  context: HostContext;
  options: GenerateOptions;
  skills: ReplyTools;
  onReasoning: (reasoning: string) => void;
  onText?: (text: string) => void;
};

/** 保留原始工具调用与模型重放信息；只有完整结束的最终回答才能进入发送流程。 */
export async function runSkillModel(params: RunSkillModelParams): Promise<BlockAssembler> {
  const messages = params.options.messages;
  let reasoning = '';
  let callsUsed = 0;
  for (let round = 0; round < 8; round += 1) {
    params.options.signal.throwIfAborted();
    const assembler = new BlockAssembler();
    let lastPublished = 0;
    const publish = () => {
      const blocks = assembler.blocks();
      params.onReasoning(
        reasoning +
          blocks
            .filter((block) => block.type === 'reasoning')
            .map((block) => block.text ?? '')
            .join(''),
      );
      params.onText?.(
        blocks
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join(''),
      );
    };
    try {
      for await (const chunk of params.context.llm.stream({
        ...params.options,
        messages: [...messages],
        tools: params.skills.tools,
      })) {
        assembler.push(chunk);
        if (Date.now() - lastPublished >= 150) {
          publish();
          lastPublished = Date.now();
        }
      }
    } finally {
      publish();
      reasoning += assembler
        .blocks()
        .filter((block) => block.type === 'reasoning')
        .map((block) => block.text ?? '')
        .join('');
      params.onReasoning(reasoning);
    }
    const calls = assembler.blocks().filter((block) => block.type === 'tool-call');
    if (!calls.length) {
      if (assembler.finish.kind !== 'stop') throw new Error('模型未正常完成，未发送残缺回复');
      return assembler;
    }
    if (!['tool-calls', 'stop'].includes(assembler.finish.kind))
      throw new Error('工具调用未完整生成，未执行');
    params.onText?.('');
    callsUsed += calls.length;
    if (callsUsed > 16) throw new Error('工具调用次数超过上限，未发送回复');
    messages.push(
      assembler.message({ provider: params.options.provider, model: params.options.model }),
    );
    for (const call of calls) {
      let content: string;
      let isError = false;
      try {
        content = await params.skills.execute(call);
      } catch (error) {
        params.options.signal.throwIfAborted();
        isError = true;
        // 文件系统错误可能包含本机路径；不把宿主原始异常送入模型。
        content = error instanceof Error && !('code' in error) ? error.message : '工具执行失败';
      }
      params.options.signal.throwIfAborted();
      messages.push(
        createToolResultMessage({
          callId: call.id,
          content: [{ type: 'text', text: content }],
          isError,
        }),
      );
    }
  }
  throw new Error('工具处理轮次超过上限，未发送回复');
}
