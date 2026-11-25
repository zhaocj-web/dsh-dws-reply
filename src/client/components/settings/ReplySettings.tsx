import { ReplyStyleSelect } from '../ReplyStyleSelect';
import { ReplyModelSelect } from '../ReplyModelSelect';
import React from 'react';
import type { ReplyConfig, ModelCatalog, Endpoint } from '../../../shared/types';
import { SectionPanel } from '../Controls';
import { FormGrid, FormItem, Input, Textarea } from '../Form';
import type { NumericConfigKey } from '../../types';
export function ReplySettings(props: ReplySettingsProps) {
  const number = (label: string, key: NumericConfigKey, min: number, max: number, help: string) => (
    <FormItem label={label} help={help}>
      <Input
        type="number"
        min={min}
        max={max}
        value={props.draftConfig[key]}
        onChange={(event) => props.updateConfig(key, Number(event.target.value))}
      />
    </FormItem>
  );
  return (
    <>
      <div className="dpr-stack">
        <div className="dpr-inline-model-setting">
          <ReplyModelSelect
            inline
            showRefresh={false}
            help="用于全局代答，联系人可在专属规则中单独选择模型。"
            value={props.draftConfig.replyModel ?? null}
            load={props.listModels}
            onChange={(value) => props.updateConfig('replyModel', value)}
          />
        </div>
        <ReplyStyleSelect
          value={props.draftConfig.activeStyleId}
          styles={props.draftConfig.replyStyles}
          onChange={(value) => props.updateConfig('activeStyleId', value)}
        />
        <FormItem label="公共回复规则" help="不需要回复时，让模型只输出 [[SKIP]]，插件会跳过。">
          <Textarea
            rows={8}
            value={props.draftConfig.rules}
            onChange={(event) => props.updateConfig('rules', event.target.value)}
          />
        </FormItem>
        <SectionPanel title="回复节奏">
          <FormGrid>
            {number(
              '同会话最短回复间隔（秒）',
              'cooldownSeconds',
              0,
              3600,
              '间隔内到达的消息会跳过。',
            )}
            {number('回复字数上限', 'maxReplyChars', 50, 4000, '超过上限时停止发送，不截断回复。')}
            {number(
              '保留上下文轮数',
              'historyTurns',
              0,
              20,
              '从本地最近 30 条记录恢复该会话的已送达回复和内部交流。',
            )}
            {number('消息有效期（秒）', 'maxAgeSeconds', 10, 600, '超过此时长的消息不触发代答。')}
          </FormGrid>
        </SectionPanel>
      </div>
    </>
  );
}

type ReplySettingsProps = {
  isBusy: boolean;
  performAction: (endpoint: Endpoint, payload?: unknown) => Promise<void>;
  listModels: () => Promise<ModelCatalog>;
  draftConfig: ReplyConfig;
  updateConfig: <K extends keyof ReplyConfig>(key: K, value: ReplyConfig[K]) => void;
};
