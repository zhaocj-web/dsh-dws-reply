import { chooseSmartModel, isSmartReplyModel, resolveReplyModel } from '../shared/reply-model';
import type { ReplyModel } from '../shared/types';
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

type SelectAvailableReplyModelParams = {
  context: HostContext;
  selected: ReplyModel | null;
  defaultModel?: ReplyModel;
};

/** 宿主默认值和已保存选择也可能过期；调用前核对目录，不自行替换明确指定的模型。 */
export async function selectAvailableReplyModel(
  params: SelectAvailableReplyModelParams,
): Promise<ReplyModel> {
  if (isSmartReplyModel(params.selected)) {
    const catalog = await listReplyModels(params.context);
    if (!catalog.models.length && catalog.failedProviders.length)
      throw new Error('模型列表加载失败，请检查供应商连接后重试');
    return chooseSmartModel({
      models: catalog.models,
      defaultModel: params.defaultModel,
      needsImages: false,
    });
  }
  const selected = resolveReplyModel({
    selected: params.selected,
    defaultModel: params.defaultModel,
  });
  const source = params.selected ? '所选回复模型' : 'DSH 默认模型';
  if (!params.context.llm.listProviders().some((provider) => provider.id === selected.provider))
    throw new Error(`${source}的供应商不存在：${selected.provider}，请重新选择模型`);
  let models: Awaited<ReturnType<HostContext['llm']['listModels']>>;
  try {
    models = await params.context.llm.listModels(selected.provider);
  } catch {
    throw new Error(
      `${source}列表加载失败，无法核验 ${selected.provider} / ${selected.model}，请检查连接后重试`,
    );
  }
  const model = models.find((item) => item.id === selected.model);
  if (!model)
    throw new Error(
      `${source}不在当前模型列表中：${selected.provider} / ${selected.model}，请刷新并重新选择`,
    );
  if (model.inputModalities && !model.inputModalities.includes('text'))
    throw new Error(`${source}不支持文字输入，请重新选择回复模型`);
  return selected;
}
