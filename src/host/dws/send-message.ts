import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ReplyConfig, ReplyTarget } from '../../shared/types';
import { markdownImages } from './markdown-images';
import { downloadImage } from './image-download';
import type { DownloadImageParams, DownloadedImage } from './image-download';
import { runDws } from './command';
import { sendArgs } from './message-policy';
import type { DeliveryReceipt } from './message-policy';
import type { DwsParams } from './command';

type SendMessageParams = {
  config: ReplyConfig;
  target: ReplyTarget;
  text: string;
  signal: AbortSignal;
};
type SendMessageServices = {
  download: (params: DownloadImageParams) => Promise<DownloadedImage>;
  send: (args: string[], params: DwsParams) => Promise<DeliveryReceipt>;
};
export class MessagePreparationError extends Error {}

/** 在隔离的临时目录准备图文，全部完成后只提交一次；无论发送结果如何均清理临时文件。 */
export async function sendMessage(
  params: SendMessageParams,
  services: SendMessageServices = {
    download: downloadImage,
    send: runDws<DeliveryReceipt>,
  },
): Promise<DeliveryReceipt> {
  let directory: string | undefined;
  try {
    let text = params.text;
    try {
      params.signal.throwIfAborted();
      const images = markdownImages(text);
      // 即使正文中的代码示例含图片语法，DWS 也只能访问这个新建的空目录。
      directory = await mkdtemp(join(tmpdir(), 'dws-reply-send-'));
      let total = 0;
      const replacements: Array<{ start: number; end: number; value: string }> = [];
      for (const [index, image] of images.entries()) {
        const downloaded = await services.download({ url: image.url, signal: params.signal });
        total += downloaded.data.length;
        if (total > 20 * 1024 * 1024) throw new Error('图片总大小不能超过 20 MB');
        const filename = `image-${index}.${downloaded.extension}`;
        await writeFile(join(directory, filename), downloaded.data, { mode: 0o600 });
        const start = image.node.position?.start.offset;
        const end = image.node.position?.end.offset;
        if (start === undefined || end === undefined) throw new Error('图片格式解析失败');
        // 文件名由程序生成；说明中的 Markdown 标记不参与 DWS 的图片路径解析。
        const alt = image.node.alt?.replace(/[\[\]\\\r\n]/g, ' ') ?? '图片';
        replacements.push({ start, end, value: `![${alt}](./${filename})` });
      }
      for (const replacement of replacements.reverse())
        text = text.slice(0, replacement.start) + replacement.value + text.slice(replacement.end);
      params.signal.throwIfAborted();
    } catch (error) {
      throw new MessagePreparationError(
        error instanceof Error ? error.message : '图片准备失败，未发送',
      );
    }
    return await services.send(sendArgs(params.config, params.target, text), {
      input: text,
      signal: params.signal,
      cwd: directory,
    });
  } finally {
    // 清理失败不能改变已确认的投递状态，更不能触发重发。
    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => {});
  }
}
