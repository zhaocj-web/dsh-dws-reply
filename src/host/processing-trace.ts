import type { ProcessingTrace } from '../shared/types';

/** 仅收集执行元信息和模型实际返回的推理文本，不参与回复正文与后续上下文。 */
export function createProcessingTrace(
  historyTurns: number,
  onUpdate?: (trace: ProcessingTrace) => void,
) {
  const started = Date.now();
  const trace: ProcessingTrace = { historyTurns, durationMs: 0, steps: [] };
  return {
    update(update: Partial<ProcessingTrace>): void {
      const steps = [...trace.steps, ...(update.steps ?? [])].slice(-30);
      const toolCalls = [...(trace.toolCalls ?? [])];
      for (const call of update.toolCalls ?? []) {
        const index = call.id ? toolCalls.findIndex((item) => item.id === call.id) : -1;
        if (index < 0) toolCalls.push(call);
        else toolCalls[index] = call;
      }
      if (toolCalls.length > 40) toolCalls.splice(0, toolCalls.length - 40);
      Object.assign(trace, update, { steps, toolCalls });
      onUpdate?.({
        ...trace,
        steps: [...steps],
        toolCalls: [...toolCalls],
        durationMs: Date.now() - started,
      });
    },
    finish(): ProcessingTrace {
      const result = { ...trace, steps: [...trace.steps], durationMs: Date.now() - started };
      delete result.partialAnswer;
      return result;
    },
  };
}
