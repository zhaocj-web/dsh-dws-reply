import { randomUUID } from 'node:crypto';
import { link, open, readFile, stat, unlink, type FileHandle } from 'node:fs/promises';
import { hasErrorCode } from '../shared/errors';

type LockIdentity = { dev: number; ino: number };
export type InstanceLock = { release(): Promise<void> };

/** 仅 ESRCH 能证明进程不存在；权限不足或 PID 被复用时均保守保留锁。 */
function ownerExited(content: string): boolean {
  if (!/^[1-9]\d*$/.test(content.trim())) return false;
  const pid = Number(content.trim());
  if (!Number.isSafeInteger(pid) || pid > 2147483647) return false;
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return hasErrorCode(error, 'ESRCH');
  }
}

async function isSameFile(path: string, identity: LockIdentity): Promise<boolean> {
  try {
    const current = await stat(path);
    return current.dev === identity.dev && current.ino === identity.ino;
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) return false;
    throw error;
  }
}

/** 使用每个旧 inode 独立的清理凭证，防止并发清理者误删刚创建的新锁。 */
async function recoverStaleLock(path: string): Promise<void> {
  let previous: FileHandle;
  try {
    previous = await open(path, 'r');
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) return;
    throw error;
  }
  try {
    const identity = await previous.stat();
    const content = await previous.readFile('utf8');
    if (!ownerExited(content)) {
      throw new Error('代答锁所属进程仍在运行，或无法确认锁是否失效；已保留锁，未启动重复实例');
    }
    const claimPath = `${path}.cleanup-${identity.dev}-${identity.ino}`;
    // 清理凭证自身也记录 PID，可在清理进程异常退出后按相同规则恢复。
    const claim = await acquireInstanceLock(claimPath);
    try {
      // 在取得清理权后再次核对文件身份和进程，不能只凭先前的 PID 删除路径。
      if ((await isSameFile(path, identity)) && ownerExited(await readFile(path, 'utf8'))) {
        await unlink(path);
      }
    } finally {
      await claim.release();
    }
  } finally {
    await previous.close();
  }
}

/** 先完整写入 PID，再原子发布硬链接，避免崩溃留下无法判定归属的空锁。 */
async function publishLock(path: string): Promise<FileHandle> {
  const temporary = `${path}.pending-${randomUUID()}`;
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(String(process.pid));
    await link(temporary, path);
    return handle;
  } catch (error) {
    await handle.close();
    throw error;
  } finally {
    await unlink(temporary);
  }
}

/** 独占创建是最终仲裁；释放时只删除自己持有的 inode，重复释放无副作用。 */
export async function acquireInstanceLock(path: string): Promise<InstanceLock> {
  let handle: FileHandle;
  try {
    handle = await publishLock(path);
  } catch (error) {
    if (!hasErrorCode(error, 'EEXIST')) throw error;
    await recoverStaleLock(path);
    try {
      handle = await publishLock(path);
    } catch (retryError) {
      if (hasErrorCode(retryError, 'EEXIST')) {
        throw new Error('另一个代答实例已取得锁，已停止本次启动');
      }
      throw retryError;
    }
  }
  const identity = await handle.stat();
  let released = false;
  const lock: InstanceLock = {
    async release() {
      if (released) return;
      released = true;
      try {
        if (await isSameFile(path, identity)) await unlink(path);
      } finally {
        await handle.close();
      }
    },
  };
  return lock;
}
