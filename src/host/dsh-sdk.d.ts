/**
 * 当前桌面宿主提供的 LLM 接口子集。
 * 只声明本插件调用的能力；运行时从 DSH 加载，构建时保持 external。
 */
declare module '@deepseek-ai/dsh-llm' {
  export interface ImageBlock {
    type: 'image';
    attachment: {
      attachmentId: string;
      mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
      bytes: number;
      width: number;
      height: number;
      name?: string;
    };
  }
  export interface TextBlock {
    type: 'text';
    text: string;
  }
  export interface OtherBlock {
    type: 'reasoning' | 'tool-call';
    text?: string;
  }
  export interface Message {
    role: 'user' | 'assistant';
    content: Array<TextBlock | ImageBlock>;
    source: { kind: 'user' } | { kind: 'model'; provider: string; model: string };
  }
  export interface GenerateOptions {
    provider: string;
    model: string;
    sessionId: string;
    messages: Message[];
    system: string;
    tools: never[];
    signal: AbortSignal;
  }
  export type StreamChunk = unknown;
  export type CreateUserMessageParams = {
    content: Array<TextBlock | ImageBlock>;
    source: { kind: 'user' };
  };
  export function createUserMessage(params: CreateUserMessageParams): Message;
  export type CreateAssistantMessageParams = {
    content: Array<TextBlock | ImageBlock>;
    source: { kind: 'model'; provider: string; model: string };
  };
  export function createAssistantMessage(params: CreateAssistantMessageParams): Message;
  export class BlockAssembler {
    push(chunk: StreamChunk): void;
    readonly finish: { kind: string };
    blocks(): Array<TextBlock | OtherBlock>;
  }
}
