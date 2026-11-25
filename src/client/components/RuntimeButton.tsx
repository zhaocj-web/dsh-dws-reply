import React from 'react';
import { IconButton } from './IconButton';

type RuntimeButtonProps = {
  enabled: boolean;
  isBusy: boolean;
  onChange: (enabled: boolean) => Promise<void>;
};

export function RuntimeButton(props: RuntimeButtonProps) {
  return (
    <IconButton
      label={props.enabled ? '停止代答' : '启动代答'}
      tooltip={props.enabled ? '立即停止代答' : '使用已保存的设置启动代答；未保存的修改请先保存。'}
      disabled={props.isBusy}
      busy={props.isBusy}
      onClick={() => void props.onChange(!props.enabled)}
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {props.enabled ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" stroke="none" />
          </>
        ) : (
          <>
            <path d="M12 3v9" />
            <path d="M6.3 5.7a9 9 0 1 0 11.4 0" />
          </>
        )}
      </svg>
    </IconButton>
  );
}
