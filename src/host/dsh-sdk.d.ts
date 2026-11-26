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
    type: 'reasoning';
    text?: string;
  }
  export interface ToolCallBlock {
    type: 'tool-call';
    id: string;
    name: string;
    arguments: string;
  }
  export type ContentBlock = TextBlock | ImageBlock | OtherBlock | ToolCallBlock;
  export interface ToolSchema {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }
  export interface Message {
    role: 'user' | 'assistant' | 'tool';
    content: ContentBlock[];
    source:
      | { kind: 'user' }
      | { kind: 'model'; provider: string; model: string }
      | { kind: 'tool'; callId: string };
  }
  export interface GenerateOptions {
    provider: string;
    model: string;
    sessionId: string;
    messages: Message[];
    system: string;
    tools: ToolSchema[];
    signal: AbortSignal;
  }
  export type StreamChunk = unknown;
  export type CreateUserMessageParams = {
    content: ContentBlock[];
    source: { kind: 'user' };
  };
  export function createUserMessage(params: CreateUserMessageParams): Message;
  export type CreateAssistantMessageParams = {
    content: ContentBlock[];
    source: { kind: 'model'; provider: string; model: string };
  };
  export function createAssistantMessage(params: CreateAssistantMessageParams): Message;
  export type ToolResultMessageInput = {
    callId: string;
    content: ContentBlock[];
    isError: boolean;
  };
  export function createToolResultMessage(params: ToolResultMessageInput): Message;
  export class BlockAssembler {
    push(chunk: StreamChunk): void;
    readonly finish: { kind: string };
    blocks(): ContentBlock[];
    message(source: { provider: string; model: string }): Message;
  }
}
