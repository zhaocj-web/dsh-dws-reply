import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const executeFile = promisify(execFile);

/** 目录仅由运行时提供，不接受页面传入的路径或命令；不经过 shell。 */
export async function openConfigDirectory(directory: string): Promise<void> {
  if (process.platform !== 'darwin') {
    throw new Error(`当前系统暂不支持自动打开目录，请手动访问：${directory}`);
  }
  try {
    await executeFile('/usr/bin/open', [directory], { timeout: 10000 });
  } catch {
    throw new Error(`无法打开配置文件目录，请手动访问：${directory}`);
  }
}
