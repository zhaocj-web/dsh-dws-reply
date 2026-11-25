import { isSmartReplyModel, smartReplyModel } from '../../shared/reply-model';
import React, { useEffect, useState } from 'react';
import type { ModelCatalog, ReplyModel } from '../../shared/types';
import { FormItem, Select } from './Form';
import { errorMessage } from '../../shared/errors';

type ReplyModelSelectProps = {
  inline?: boolean;
  showRefresh?: boolean;
  actions?: React.ReactNode;
  value: ReplyModel | null;
  defaultLabel?: string;
  help?: string;
  load: () => Promise<ModelCatalog>;
  onChange: (model: ReplyModel | null) => void;
};

/** 列表加载不覆盖已保存选择；已移除的模型明确标记，不悄悄切换到默认模型。 */
export function ReplyModelSelect(props: ReplyModelSelectProps) {
  const [catalog, setCatalog] = useState<ModelCatalog>({ models: [], failedProviders: [] });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError('');
    props
      .load()
      .then((result) => {
        if (active) setCatalog(result);
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [props.load, revision]);
  const key = (model: ReplyModel) => JSON.stringify([model.provider, model.model]);
  const selected = props.value ? key(props.value) : '';
  const smart = isSmartReplyModel(props.value);
  const missing = props.value && !smart && !catalog.models.some((model) => key(model) === selected);
  return (
    <>
      <FormItem
        label="回复模型"
        layout={props.inline ? 'inline' : 'vertical'}
        error={error}
        help={
          smart
            ? '文字优先使用默认模型；图片自动选择支持视觉的模型。'
            : (props.help ?? '保存后用于自动回复和模型自检，不修改 DSH 的默认模型。')
        }
      >
        <div className="dpr-model-select-row">
          <Select
            value={selected}
            onChange={(event) => {
              if (event.target.value === key(smartReplyModel)) {
                props.onChange({ ...smartReplyModel });
                return;
              }
              const model = catalog.models.find((item) => key(item) === event.target.value);
              props.onChange(model ? { provider: model.provider, model: model.model } : null);
            }}
          >
            <option value="">{props.defaultLabel ?? '跟随 DSH 默认模型'}</option>
            <option value={key(smartReplyModel)}>模型智能选择</option>
            {missing && (
              <option value={selected}>
                {props.value!.provider} / {props.value!.model}（{busy ? '加载中' : '未在列表中'}）
              </option>
            )}
            {catalog.models.map((model) => (
              <option key={key(model)} value={key(model)}>
                {model.providerName} · {model.name}
                {model.supportsImages ? ' · 支持图片' : ''}
              </option>
            ))}
          </Select>
          {props.showRefresh !== false && (
            <button
              type="button"
              className="dpr-btn dpr-model-refresh"
              aria-label={busy ? '正在加载模型列表' : '刷新模型列表'}
              title={busy ? '正在加载模型列表' : '刷新模型列表'}
              aria-busy={busy}
              disabled={busy}
              onClick={() => setRevision((value) => value + 1)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden={true}
              >
                <path d="M20 7v5h-5M4 17v-5h5" />
                <path d="M6.1 6.1A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 5.9" />
              </svg>
            </button>
          )}
          {props.actions}
        </div>
      </FormItem>
      {catalog.failedProviders.length > 0 && (
        <p className="dpr-help">部分供应商加载失败：{catalog.failedProviders.join('、')}</p>
      )}
    </>
  );
}
