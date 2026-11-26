import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { MessageImagesResult } from '../shared/types';
import { readJson } from './storage';

type CacheParams = { directory: string; profile: string; messageId: string };
type ImageInput = { data: Uint8Array; mediaType: string };
type SaveImagesParams = CacheParams & { images: ReadonlyArray<ImageInput> };
type CachedImage = { id: string; mediaType: string };

function cacheDirectory(params: CacheParams): string {
  const account = createHash('sha256').update(params.profile).digest('hex');
  const message = createHash('sha256').update(params.messageId).digest('hex');
  return join(params.directory, 'message-images', account, message);
}

/** 内容寻址的本地图片缓存不随处理记录传回；仅在用户查看消息时读取。 */
export async function cacheMessageImages(params: SaveImagesParams): Promise<void> {
  const directory = cacheDirectory(params);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const images: CachedImage[] = [];
  for (const image of params.images) {
    const id = createHash('sha256').update(image.data).digest('hex');
    await writeFile(join(directory, id), image.data, { mode: 0o600 });
    images.push({ id, mediaType: image.mediaType });
  }
  const temporary = join(directory, `manifest-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, JSON.stringify(images), { mode: 0o600 });
    await rename(temporary, join(directory, 'manifest.json'));
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function readMessageImages(params: CacheParams): Promise<MessageImagesResult | null> {
  const directory = cacheDirectory(params);
  const manifest = await readJson<CachedImage[] | null>(join(directory, 'manifest.json'), null);
  if (!manifest) return null;
  if (!Array.isArray(manifest) || manifest.length > 4) throw new Error('图片缓存无效');
  const images: MessageImagesResult['images'] = [];
  let total = 0;
  for (const item of manifest) {
    if (
      !/^[a-f0-9]{64}$/.test(item.id) ||
      !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(item.mediaType)
    )
      throw new Error('图片缓存无效');
    const data = await readFile(join(directory, item.id));
    total += data.length;
    if (data.length > 10 * 1024 * 1024 || total > 20 * 1024 * 1024)
      throw new Error('图片缓存超过大小限制');
    images.push({
      id: item.id,
      dataUrl: `data:${item.mediaType};base64,${data.toString('base64')}`,
    });
  }
  return { images };
}
