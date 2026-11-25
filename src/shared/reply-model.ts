import type { ReplyModel } from './types';

type ResolveReplyModelParams = {
  selected: ReplyModel | null;
  defaultModel?: ReplyModel;
};
/** 专属选择优先，缺少默认模型时明确报错，不修改宿主默认配置。 */
export function resolveReplyModel(params: ResolveReplyModelParams): ReplyModel {
  if (isSmartReplyModel(params.selected)) throw new Error('智能选择需先解析为实际回复模型');
  const model = params.selected ?? params.defaultModel;
  if (!model?.provider || !model.model) throw new Error('请选择回复模型或先设置 DSH 默认模型');
  return { provider: model.provider, model: model.model };
}

/** 插件内部策略标识，不作为供应商或模型 ID 发送给宿主。 */
export const smartReplyModel: ReplyModel = { provider: '__dpr__', model: 'smart' };

export function isSmartReplyModel(model: ReplyModel | null | undefined): boolean {
  return model?.provider === smartReplyModel.provider && model.model === smartReplyModel.model;
}

type ChooseSmartModelParams = {
  models: Array<ReplyModel & { supportsImages?: boolean }>;
  defaultModel?: ReplyModel;
  needsImages: boolean;
};

/** 优先默认模型，其次同供应商，最后按稳定 ID 选择；不推测模型的视觉能力。 */
export function chooseSmartModel(params: ChooseSmartModelParams): ReplyModel {
  const available = params.models.filter((model) => !params.needsImages || model.supportsImages);
  const preferred = available.find(
    (model) =>
      model.provider === params.defaultModel?.provider &&
      model.model === params.defaultModel?.model,
  );
  const sorted = [...available].sort((a, b) => {
    const priority =
      Number(b.provider === params.defaultModel?.provider) -
      Number(a.provider === params.defaultModel?.provider);
    return priority || `${a.provider}/${a.model}`.localeCompare(`${b.provider}/${b.model}`);
  });
  const selected = preferred ?? sorted[0];
  if (!selected)
    throw new Error(
      params.needsImages
        ? '没有可用的视觉模型，请先在 DSH 中配置支持图片的模型'
        : '没有可用的回复模型，请先在 DSH 中配置模型',
    );
  return { provider: selected.provider, model: selected.model };
}
