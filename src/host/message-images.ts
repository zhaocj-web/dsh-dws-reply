import { traceTool } from './tool-trace';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, realpath, rm, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import type { ImageBlock } from '@deepseek-ai/dsh-llm';
import type { MessageEvent, ProcessingTrace } from '../shared/types';
import type { HostContext } from './contracts';
import { runDws } from './dws/command';
import { UnsupportedMessageError } from './unsupported-message';

type Resource = {
  contentType?: string;
  type?: string;
  resourceId?: string;
  resourceIdType?: string;
};
type MessageDetails = {
  complete?: boolean;
  failedCount?: number;
  messages?: Array<{
    messageId: string;
    conversationId: string;
    senderId: string;
    resourceRefs?: Resource[];
  }>;
};
type ImageResourcesParams = { details: MessageDetails; event: MessageEvent };
type LoadMessageImagesParams = {
  onTrace?: (update: Partial<ProcessingTrace>) => void;
  event: MessageEvent;
  profile: string;
  directory: string;
  signal: AbortSignal;
  supportsImages: () => Promise<boolean>;
  run?: typeof runDws;
  attachments: HostContext['attachments'];
};
type DownloadReceipt = {
  localPath: string;
  messageId: string;
  resourceId: string;
  messageVerified: boolean;
};

/** 仅使用服务端核验的当前消息资源，不从正文提取 URL、文件路径或资源 ID。 */
export function selectImageResources(params: ImageResourcesParams): Resource[] {
  if (params.details.complete !== true || params.details.failedCount)
    throw new Error('消息资源查询不完整，未生成回复');
  const messages =
    params.details.messages?.filter((message) => message.messageId === params.event.message_id) ??
    [];
  if (
    messages.length !== 1 ||
    messages[0].conversationId !== params.event.conversation_id ||
    messages[0].senderId !== params.event.sender_open_dingtalk_id
  )
    throw new Error('图片所属消息或发送人不匹配，未生成回复');
  const resources = messages[0].resourceRefs ?? [];
  const images = resources.filter(
    (resource) => resource.contentType === 'image' || resource.type === 'image',
  );
  if (resources.length && !images.length)
    throw new UnsupportedMessageError('当前仅支持文字和图片，语音、文件及视频暂不解析');
  if (resources.some((resource) => resource.contentType && resource.contentType !== 'image'))
    throw new UnsupportedMessageError('消息包含暂不支持的媒体类型，未生成不完整回复');
  const unique = [...new Map(images.map((image) => [image.resourceId, image])).values()];
  if (
    unique.some(
      (image) => !image.resourceId || !['mediaId', 'fileId'].includes(image.resourceIdType ?? ''),
    )
  )
    throw new Error('图片资源标识不完整');
  if (unique.length > 4) throw new UnsupportedMessageError('单条消息最多处理 4 张图片');
  return unique;
}

/** 按文件签名判定格式，附件服务还会完整解码校验，拒绝伪装成图片的文件。 */
export function imageMediaType(
  data: Uint8Array,
): 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' {
  const bytes = Buffer.from(data);
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString())) return 'image/gif';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP')
    return 'image/webp';
  throw new UnsupportedMessageError('图片格式不支持，仅支持 PNG、JPEG、GIF 和 WebP');
}

export async function loadMessageImages(params: LoadMessageImagesParams): Promise<ImageBlock[]> {
  params.signal.throwIfAborted();
  const execute = params.run ?? runDws;
  const run: typeof runDws = (args, options) =>
    traceTool({
      tool:
        args[1] === '+messages-mget'
          ? 'DWS · chat +messages-mget'
          : 'DWS · chat +messages-resource-download',
      purpose: args[1] === '+messages-mget' ? '核对来信身份与媒体资源' : '下载当前消息的图片',
      run: () => execute(args, options),
      onTrace: params.onTrace,
      signal: params.signal,
    });
  const details = await run<MessageDetails>(
    [
      'chat',
      '+messages-mget',
      '--msg-ids',
      params.event.message_id!,
      '--no-reactions',
      '--no-threads',
      '--profile',
      params.profile,
      '--format',
      'json',
    ],
    { signal: params.signal },
  );
  const resources = selectImageResources({ details, event: params.event });
  if (!resources.length) return [];
  if (!(await params.supportsImages()))
    throw new UnsupportedMessageError('当前回复模型不支持图片，请选择支持视觉的模型');
  const directory = await mkdtemp(join(params.directory, 'image-'));
  try {
    const inputs: Parameters<HostContext['attachments']['saveImages']>[0][number][] = [];
    const seen = new Set<string>();
    let total = 0;
    for (const resource of resources) {
      params.signal.throwIfAborted();
      const receipt = await run<DownloadReceipt>(
        [
          'chat',
          '+messages-resource-download',
          '--message-id',
          params.event.message_id!,
          '--open-conversation-id',
          params.event.conversation_id!,
          '--resource-id',
          resource.resourceId!,
          '--type',
          resource.resourceIdType!,
          '--output',
          '.',
          '--profile',
          params.profile,
          '--format',
          'json',
        ],
        { signal: params.signal, cwd: directory },
      );
      if (
        !receipt.messageVerified ||
        receipt.messageId !== params.event.message_id ||
        receipt.resourceId !== resource.resourceId
      )
        throw new Error('图片下载回执与消息不匹配');
      const file = await realpath(resolve(directory, receipt.localPath));
      const local = relative(await realpath(directory), file);
      if (local.startsWith('..') || isAbsolute(local)) throw new Error('图片路径超出临时目录');
      const info = await stat(file);
      if (!info.isFile() || info.size > 10 * 1024 * 1024)
        throw new UnsupportedMessageError('单张图片不能超过 10 MB');
      const data = await readFile(file);
      total += data.length;
      if (total > 20 * 1024 * 1024)
        throw new UnsupportedMessageError('单条消息图片总大小不能超过 20 MB');
      const digest = createHash('sha256').update(data).digest('hex');
      if (seen.has(digest)) continue;
      seen.add(digest);
      inputs.push({ data, mediaType: imageMediaType(data), name: `钉钉图片-${inputs.length + 1}` });
    }
    params.signal.throwIfAborted();
    const refs = await traceTool({
      tool: 'DSH · attachments.saveImages',
      purpose: '校验图片并创建模型附件',
      run: () => params.attachments.saveImages(inputs),
      onTrace: params.onTrace,
      signal: params.signal,
      summarize: (items) => `已创建 ${items.length} 个图片附件`,
    });
    params.signal.throwIfAborted();
    return refs.map((attachment) => ({ type: 'image', attachment }));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
