import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { ProcessingRecord } from '../shared/types';
import { readJson, writeJsonAtomic } from './storage';

type RecordStoreParams = {
  directory: string;
  profile: string;
};

const RECORDS_PER_CONVERSATION = 100;
const RECORDS_PER_ACCOUNT = 2000;

/** 输入按新到旧排列；分别限制会话和账号容量，防止单个活跃会话占满历史。 */
function retainRecords(records: ProcessingRecord[]): ProcessingRecord[] {
  const counts = new Map<string, number>();
  const retained: ProcessingRecord[] = [];
  for (const record of records) {
    const key = JSON.stringify([record.kind, record.target]);
    const count = counts.get(key) ?? 0;
    if (count >= RECORDS_PER_CONVERSATION) continue;
    counts.set(key, count + 1);
    retained.push(record);
    if (retained.length >= RECORDS_PER_ACCOUNT) break;
  }
  return retained;
}

/** 按账号隔离记录；串行原子写入避免并发覆盖或异常退出留下半个文件。 */
export async function createRecordStore(params: RecordStoreParams) {
  const account = createHash('sha256').update(params.profile).digest('hex');
  const path = join(params.directory, `records-${account}.json`);
  const saved = await readJson<ProcessingRecord[]>(path, []);
  if (!Array.isArray(saved)) throw new Error('处理记录文件格式异常');
  let records = retainRecords(saved);
  let pending = Promise.resolve();
  let latestWrite = pending;
  return {
    get records() {
      return [...records];
    },
    append(record: ProcessingRecord): Promise<void> {
      records = retainRecords([record, ...records]);
      const snapshot = [...records];
      const task = pending.then(() => writeJsonAtomic(path, snapshot));
      latestWrite = task;
      // 队列允许后续写入恢复，但 flush 必须保留最近一次保存的失败结果。
      pending = task.catch(() => {});
      return task;
    },
    flush: () => latestWrite,
  };
}
