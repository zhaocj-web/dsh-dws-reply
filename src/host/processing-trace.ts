import type { ProcessingTrace } from '../shared/types';

/** 仅收集执行元信息和模型实际返回的推理文本，不参与回复正文与后续上下文。 */
export function createProcessingTrace(historyTurns: number) {
  const started = Date.now();
  const trace: ProcessingTrace = { historyTurns, durationMs: 0, steps: [] };
  return {
    update(update: Partial<ProcessingTrace>): void {
      const steps = [...trace.steps, ...(update.steps ?? [])].slice(-30);
      const toolCalls = [...(trace.toolCalls ?? []), ...(update.toolCalls ?? [])].slice(-40);
      Object.assign(trace, update, { steps, toolCalls });
    },
    finish(): ProcessingTrace {
      return { ...trace, steps: [...trace.steps], durationMs: Date.now() - started };
    },
  };
}
