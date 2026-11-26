import { resolveImageAddress } from './image-address';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

export type DownloadImageParams = { url: string; signal: AbortSignal };
export type DownloadedImage = { data: Buffer; extension: string };
const MAX_BYTES = 10 * 1024 * 1024;

/** 只接受明确的公网 HTTP(S) 地址，不携带认证信息或非标准服务端口。 */
export function imageUrl(value: string): URL {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port)
    throw new Error('图片必须使用不含认证信息的公网 HTTP(S) 链接');
  if (
    url.hostname === 'localhost' ||
    url.hostname.endsWith('.localhost') ||
    url.hostname.includes(':')
  )
    throw new Error('图片不支持本机地址或 IPv6 地址');
  return url;
}

/** 按文件签名识别图片，不信任扩展名和服务端 Content-Type。 */
export function imageExtension(data: Buffer): string {
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (data[0] === 255 && data[1] === 216 && data[2] === 255) return 'jpg';
  if (['GIF87a', 'GIF89a'].includes(data.subarray(0, 6).toString())) return 'gif';
  if (data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP')
    return 'webp';
  throw new Error('图片仅支持 PNG、JPEG、GIF、WebP，链接返回的内容不是受支持的图片');
}

/** DNS 校验后固定连接地址；每次重定向重新校验，避免访问内网与 DNS 重绑定。 */
export async function downloadImage(params: DownloadImageParams): Promise<DownloadedImage> {
  const signal = AbortSignal.any([params.signal, AbortSignal.timeout(15000)]);
  let url = imageUrl(params.url);
  for (let hop = 0; hop <= 3; hop += 1) {
    signal.throwIfAborted();
    const address = await resolveImageAddress({ hostname: url.hostname, signal });
    const response = await new Promise<import('node:http').IncomingMessage>((resolve, reject) => {
      const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
        url,
        {
          signal,
          headers: {
            Accept: 'image/png,image/jpeg,image/gif,image/webp',
            'Accept-Encoding': 'identity',
          },
          lookup: (_hostname, options, callback) => {
            if (options.all) callback(null, [{ address, family: 4 }]);
            else callback(null, address, 4);
          },
        },
        resolve,
      );
      request.on('error', reject);
      request.end();
    });
    if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
      response.destroy();
      if (!response.headers.location || hop === 3) throw new Error('图片链接重定向过多或地址无效');
      url = imageUrl(new URL(response.headers.location, url).href);
      continue;
    }
    if (response.statusCode !== 200) {
      response.destroy();
      throw new Error('图片下载失败，链接未返回成功响应');
    }
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      for await (const chunk of response) {
        signal.throwIfAborted();
        const bytes = Buffer.from(chunk);
        size += bytes.length;
        if (size > MAX_BYTES) throw new Error('单张图片不能超过 10 MB');
        chunks.push(bytes);
      }
    } finally {
      response.destroy();
    }
    const data = Buffer.concat(chunks);
    return { data, extension: imageExtension(data) };
  }
  throw new Error('图片下载失败');
}
