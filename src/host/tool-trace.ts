import type { ProcessingTrace, ToolCallRecord } from '../shared/types';

type TraceToolParams<T> = {
  tool: string;
  purpose: string;
  run: () => Promise<T>;
  onTrace?: (update: Partial<ProcessingTrace>) => void;
  signal?: AbortSignal;
  summarize?: (result: T) => string;
};

/** 仅保存代码定义的接口名和结果摘要，不记录参数、正文、路径或原始异常。 */
export async function traceTool<T>(params: TraceToolParams<T>): Promise<T> {
  const started = Date.now();
  let status: ToolCallRecord['status'] = 'failed';
  let result = '调用失败，原因见处理结果';
  try {
    const value = await params.run();
    status = 'success';
    result = params.summarize?.(value) ?? '调用完成';
    return value;
  } finally {
    if (params.signal?.aborted && status !== 'success') {
      status = 'cancelled';
      result = '调用已取消';
    }
    params.onTrace?.({
      toolCalls: [
        {
          tool: params.tool,
          purpose: params.purpose,
          status,
          result,
          time: new Date(started).toISOString(),
          durationMs: Date.now() - started,
        },
      ],
    });
  }
}
