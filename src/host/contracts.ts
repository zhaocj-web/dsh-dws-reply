import type { GenerateOptions, StreamChunk, ImageBlock } from '@deepseek-ai/dsh-llm';
/** 插件使用的宿主服务子集。实现由 DSH 注入，不在插件内重新创建。 */
export interface HostContext {
  attachments: {
    saveImages(
      inputs: ReadonlyArray<{
        data: Uint8Array;
        mediaType: ImageBlock['attachment']['mediaType'];
        name?: string;
      }>,
    ): Promise<ReadonlyArray<ImageBlock['attachment']>>;
  };
  llm: {
    listProviders(): Array<{ id: string; name: string }>;
    listModels(
      provider: string,
    ): Promise<Array<{ provider: string; id: string; name: string; inputModalities?: string[] }>>;
    stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
  };
  agentDefaultModel: {
    currentSelection():
      | {
          provider: string;
          model: string;
        }
      | undefined;
  };
  connection: {
    fetch: {
      register(route: FetchRoute): () => void;
    };
  };
  effect(register: () => () => void): void;
  on(event: 'dispose', callback: () => Promise<void>): void;
}
export interface FetchRoute {
  path: string;
  methods: ['POST'];
  requestBody: 'buffered';
  fetch(request: Request): Promise<Response>;
}
