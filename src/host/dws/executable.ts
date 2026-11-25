import { homedir } from 'node:os';
import { join } from 'node:path';
import { hasErrorCode } from '../../shared/errors';

/** 单次调用与持续监听使用同一可执行文件，保留自定义安装路径。 */
export function dwsExecutable(): string {
  return process.env.DWS_BIN || join(homedir(), '.local/bin/dws');
}

export function dwsLaunchError(error: unknown): string {
  if (hasErrorCode(error, 'ENOENT'))
    return '未找到 DWS，请先安装 DWS CLI；已安装时请检查 ~/.local/bin/dws 或通过 DWS_BIN 指定路径，然后重新连接。';
  if (hasErrorCode(error, 'EACCES') || hasErrorCode(error, 'EPERM'))
    return 'DWS 无法执行，请检查安装文件的执行权限及系统授权。';
  return '无法启动 DWS，请检查安装路径和运行环境。';
}
