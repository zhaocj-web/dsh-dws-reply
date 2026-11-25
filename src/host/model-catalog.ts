import type { ModelCatalog } from '../shared/types';
import type { HostContext } from './contracts';

/** 只投影模型名称和路由，不向页面暴露供应商凭据；部分失败保留其余可选模型。 */
export async function listReplyModels(context: HostContext): Promise<ModelCatalog> {
  const providers = context.llm.listProviders();
  const results = await Promise.allSettled(
    providers.map((provider) => context.llm.listModels(provider.id)),
  );
  const catalog: ModelCatalog = { models: [], failedProviders: [] };
  results.forEach((result, index) => {
    const provider = providers[index];
    if (result.status === 'rejected') {
      catalog.failedProviders.push(provider.name);
      return;
    }
    for (const model of result.value) {
      if (model.inputModalities && !model.inputModalities.includes('text')) continue;
      catalog.models.push({
        provider: provider.id,
        providerName: provider.name,
        model: model.id,
        name: model.name,
        ...(model.inputModalities?.includes('image') ? { supportsImages: true } : {}),
      });
    }
  });
  return catalog;
}
