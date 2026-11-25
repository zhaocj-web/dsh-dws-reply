import React from 'react';
import type { Endpoint, PluginSnapshot, ReplyConfig } from '../../../shared/types';
import { IconButton } from '../IconButton';
import { ActionButton, SectionPanel } from '../Controls';
export function AccountSettings(props: AccountSettingsProps) {
  const details = props.snapshot.state.accountDetails;
  return (
    <>
      <div className="dpr-grid dpr-account-settings">
        <SectionPanel
          title="钉钉账号"
          actions={
            <IconButton
              label="刷新账号资料"
              busy={props.isBusy}
              disabled={props.isBusy || !props.snapshot.config.profile}
              onClick={() => props.performAction('refreshAccount')}
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
            </IconButton>
          }
        >
          <>
            {details ? (
              <dl className="dpr-config-descriptions">
                {details.name && (
                  <div>
                    <dt>姓名</dt>
                    <dd>{details.name}</dd>
                  </div>
                )}
                {details.company && (
                  <div>
                    <dt>公司</dt>
                    <dd>{details.company}</dd>
                  </div>
                )}
                {details.department && (
                  <div>
                    <dt>部门</dt>
                    <dd>{details.department}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p>
                {props.snapshot.state.account ||
                  (props.draftConfig.profile
                    ? '点击刷新获取账号资料。'
                    : '请先在 DWS 登录，再关联账号。')}
              </p>
            )}
            {props.draftConfig.profile && (
              <details>
                <summary className="dpr-help">查看账号标识</summary>
                <div className="dpr-code">{props.draftConfig.profile}</div>
              </details>
            )}
            {!props.draftConfig.profile && (
              <div className="dpr-actions">
                <ActionButton
                  label={props.isBusy ? '处理中…' : '关联当前 DWS 账号'}
                  onClick={() => props.performAction('connect', { profile: '' })}
                  disabled={props.isBusy || props.snapshot.config.enabled}
                />
              </div>
            )}
          </>
        </SectionPanel>
        <SectionPanel title="运行环境">
          <>
            <dl className="dpr-config-descriptions">
              <div>
                <dt>可处理内容</dt>
                <dd>文字、图片和截图</dd>
              </div>
              <div>
                <dt>后台运行</dt>
                <dd>随当前 DSH 应用运行</dd>
              </div>
            </dl>
            <p className="dpr-help">
              新增模型请先在 DSH 模型设置中配置。图片需要支持视觉的模型；语音、文件和视频暂不解析。
            </p>
          </>
        </SectionPanel>
      </div>
    </>
  );
}

type AccountSettingsProps = {
  snapshot: PluginSnapshot;
  draftConfig: ReplyConfig;
  isBusy: boolean;
  performAction: (endpoint: Endpoint, payload?: unknown) => Promise<void>;
};
