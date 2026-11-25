import { spawn, type ChildProcess } from 'node:child_process';
import { dwsExecutable, dwsLaunchError } from './executable';
import { createInterface } from 'node:readline';
import type { MessageEvent } from '../../shared/types';

type SubscriptionParams = {
  profile: string;
  kind: 'all-direct' | 'at-me';
  signal: AbortSignal;
  onReady(): void;
  onMessage(event: MessageEvent): void;
  onFailure(reason: string): void;
};

/** stdout 只解析事件，stderr 只识别生命周期标记，不把原始日志暴露到界面。 */
export function startSubscription(params: SubscriptionParams): ChildProcess {
  const child = spawn(
    dwsExecutable(),
    [
      'event',
      '+listen-im',
      '--profile',
      params.profile,
      '--kind',
      params.kind,
      '--events',
      'message',
      '--format',
      'ndjson',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], shell: false },
  );

  let ready = false;
  const readyTimer = setTimeout(() => {
    if (!ready && !params.signal.aborted) {
      params.onFailure('DWS 订阅未在 45 秒内就绪；请保存设置后重试');
    }
  }, 45000);

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr = (stderr + chunk).slice(-16000);
    if (!ready && stderr.includes('[event] ready')) {
      ready = true;
      clearTimeout(readyTimer);
      params.onReady();
    }
  });

  const lines = createInterface({ input: child.stdout });
  lines.on('line', (line) => {
    if (line.length > 100000 || params.signal.aborted) return;
    try {
      const event: unknown = JSON.parse(line);
      if (typeof event === 'object' && event !== null) params.onMessage(event as MessageEvent);
    } catch {
      // 单条非 JSON 输出不影响后续事件；目标和正文仍由消息筛选器校验。
    }
  });

  let exited = false;
  const handleExit = (error?: Error) => {
    if (exited) return;
    exited = true;
    clearTimeout(readyTimer);
    lines.close();
    if (!params.signal.aborted) {
      // 交给用户检查后重新连接，不绕过 DWS 的订阅重试保护。
      params.onFailure(
        error
          ? dwsLaunchError(error)
          : 'DWS 监听已断开，未自动重试；检查登录/网络后保存设置重新连接',
      );
    }
  };
  child.on('error', handleExit);
  child.on('close', () => handleExit());
  return child;
}
