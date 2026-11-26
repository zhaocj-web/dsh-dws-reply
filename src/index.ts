import { connectHostServices } from './host/host-services';
import type { PluginContext } from './host/host-services';
import { registerRpc } from './host/rpc';
import { createRuntime } from './host/runtime';
export const name = 'dsh-dws-reply';
export const inject = ['llm', 'agentDefaultModel', 'connection', 'attachments'];
/** DSH 插件主入口：组装运行时并注册前端接口。 */
export async function apply(context: PluginContext): Promise<void> {
  const runtime = await createRuntime(connectHostServices(context));
  registerRpc(context, runtime);
}
