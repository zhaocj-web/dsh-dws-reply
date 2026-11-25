import { spawn } from 'node:child_process';
import { dwsExecutable, dwsLaunchError } from './executable';
export type DwsParams = {
  input?: string;
  cwd?: string;
  signal?: AbortSignal;
  timeout?: number;
};
/** 不经过 shell；正文从 stdin 输入，避免消息内容被解释为命令。 */
export function runDws<T>(args: string[], params: DwsParams = {}): Promise<T> {
  const input = params.input;
  const signal = params.signal;
  const timeout = params.timeout ?? 45000;
  return new Promise<T>((resolve, reject) => {
    const child = spawn(dwsExecutable(), args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      cwd: params.cwd,
    });
    let stdout = '',
      stderr = '',
      settled = false;
    const settle = (error: Error | null, value?: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      error ? reject(error) : resolve(value!);
    };
    const abort = () => {
      child.kill('SIGTERM');
      settle(new Error('操作已取消'));
    };
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      settle(new Error('DWS 超时；未自动重试'));
    }, timeout);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    child.on('error', (error) => settle(new Error(dwsLaunchError(error))));
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (stdout.length > 2e6) abort();
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < 64000) stderr += chunk;
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
    child.on('close', (code) => {
      if (code !== 0) {
        let reason = '执行失败';
        try {
          const failure = JSON.parse(stderr).error;
          reason = failure?.reason || failure?.category || reason;
        } catch {}
        settle(new Error(`DWS ${reason}（退出码 ${code}），请检查登录状态或权限`));
        return;
      }
      try {
        const data = JSON.parse(stdout);
        if (data.error || data.ok === false || data.success === false) throw Error();
        settle(null, data);
      } catch {
        settle(new Error('DWS 返回失败或无效 JSON；未自动重试'));
      }
    });
  });
}
