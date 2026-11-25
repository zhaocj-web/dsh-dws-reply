import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { MessageEvent } from '../shared/types';
import { readJson, writeJsonAtomic } from './storage';

export type PendingMessage = { key: string; receivedAt: number; event: MessageEvent };
type PendingStoreParams = { directory: string; profile: string };
export type PendingStore = Awaited<ReturnType<typeof createPendingStore>>;

/** 账号隔离、串行原子落盘；写入完成前不允许调用模型或发送。 */
export async function createPendingStore(params: PendingStoreParams) {
  const account = createHash('sha256').update(params.profile).digest('hex');
  const path = join(params.directory, `pending-${account}.json`);
  let entries = await readJson<PendingMessage[]>(path, []);
  if (
    !Array.isArray(entries) ||
    entries.some(
      (entry) =>
        !entry ||
        !/^[a-f0-9]{64}$/.test(entry.key) ||
        !Number.isFinite(entry.receivedAt) ||
        !entry.event ||
        typeof entry.event !== 'object',
    )
  ) {
    throw new Error('待处理消息文件格式异常，已停止恢复');
  }
  let pending = Promise.resolve();
  let latestWrite = pending;
  function update(transform: (current: PendingMessage[]) => PendingMessage[]): Promise<void> {
    const task = pending.then(async () => {
      const next = transform(entries);
      await writeJsonAtomic(path, next);
      entries = next;
    });
    latestWrite = task;
    pending = task.catch(() => {});
    return task;
  }
  return {
    get entries() {
      return structuredClone(entries);
    },
    add(entry: PendingMessage) {
      const snapshot = structuredClone(entry);
      return update((current) =>
        current.some((item) => item.key === snapshot.key) ? current : [...current, snapshot],
      );
    },
    remove(key: string) {
      return update((current) => current.filter((item) => item.key !== key));
    },
    flush: () => latestWrite,
  };
}
