import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { ProcessingRecord } from '../shared/types';
import { readJson, writeJsonAtomic } from './storage';

type RecordStoreParams = {
  directory: string;
  profile: string;
};

/** 按账号隔离记录；串行原子写入避免并发覆盖或异常退出留下半个文件。 */
export async function createRecordStore(params: RecordStoreParams) {
  const account = createHash('sha256').update(params.profile).digest('hex');
  const path = join(params.directory, `records-${account}.json`);
  const saved = await readJson<ProcessingRecord[]>(path, []);
  if (!Array.isArray(saved)) throw new Error('处理记录文件格式异常');
  let records = saved.slice(0, 30);
  let pending = Promise.resolve();
  return {
    get records() {
      return [...records];
    },
    append(record: ProcessingRecord): Promise<void> {
      records = [record, ...records].slice(0, 30);
      const snapshot = [...records];
      const task = pending.then(() => writeJsonAtomic(path, snapshot));
      pending = task.catch(() => {});
      return task;
    },
    flush: () => pending,
  };
}
