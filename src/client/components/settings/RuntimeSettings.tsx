import React from 'react';
import type { PluginSnapshot, ReplyConfig } from '../../../shared/types';
import { SwitchFormItem } from '../Form';
import { SectionPanel } from '../Controls';
import { describeReplyScope } from '../../view-metadata';

type RuntimeSettingsProps = {
  snapshot: PluginSnapshot;
  draftConfig: ReplyConfig;
  updateConfig: <K extends keyof ReplyConfig>(key: K, value: ReplyConfig[K]) => void;
};
export function RuntimeSettings(props: RuntimeSettingsProps) {
  return (
    <div className="dpr-stack">
      <SectionPanel title="运行控制">
        <div className="dpr-overview-controls">
          <SwitchFormItem
            label="自动发送回复"
            help="开启后以你的账号身份自动发送回复，并保留钉钉 AI 发送角标；关闭后仅生成草稿，不发送消息。"
            checked={props.draftConfig.mode === 'auto'}
            onChange={(checked) => props.updateConfig('mode', checked ? 'auto' : 'draft')}
          />
        </div>
      </SectionPanel>
      <SectionPanel title="当前生效配置">
        <dl className="dpr-config-descriptions">
          <div>
            <dt>钉钉账号</dt>
            <dd>{props.snapshot.config.profile ? '已关联' : '未关联'}</dd>
          </div>
          <div>
            <dt>回复模式</dt>
            <dd>{props.snapshot.config.mode === 'auto' ? '自动发送' : '仅生成草稿'}</dd>
          </div>
          <div>
            <dt>私聊范围</dt>
            <dd>{describeReplyScope(props.snapshot.config, 'direct')}</dd>
          </div>
          <div>
            <dt>群聊范围</dt>
            <dd>{describeReplyScope(props.snapshot.config, 'group')}</dd>
          </div>
        </dl>
      </SectionPanel>
    </div>
  );
}
