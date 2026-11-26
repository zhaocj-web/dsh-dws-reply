import type { HostContext } from './contracts';

export type PluginContext = HostContext & {
  inject(dependencies: string[], callback: (context: HostContext) => void): unknown;
};
type OptionalServices = Pick<HostContext, 'skills' | 'web'>;

/** 可选服务使用独立依赖作用域，避免服务缺失时阻止基础 RPC 注册。 */
export function connectHostServices(context: PluginContext): HostContext {
  const services: OptionalServices = {};
  for (const name of ['skills', 'web'] as const) {
    context.inject([name], (scoped) => {
      if (name === 'skills') services.skills = scoped.skills;
      else services.web = scoped.web;
      scoped.effect(() => () => {
        delete services[name];
      });
    });
  }
  // 使用显式适配器，既不写入宿主代理，也不在未声明依赖的作用域读取可选服务。
  return {
    attachments: context.attachments,
    llm: context.llm,
    agentDefaultModel: context.agentDefaultModel,
    connection: context.connection,
    effect: (register) => context.effect(register),
    on: (event, callback) => context.on(event, callback),
    get skills() {
      return services.skills;
    },
    get web() {
      return services.web;
    },
  };
}
