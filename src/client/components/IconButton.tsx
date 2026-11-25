import React from 'react';

type IconButtonProps = {
  className?: string;
  label: string;
  tooltip?: string;
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

/** 图标仅作视觉呈现，按钮名称供读屏和悬停提示使用。 */
export function IconButton(props: IconButtonProps) {
  return (
    <button
      type="button"
      className={`dpr-icon-button ${props.className ?? ''}`}
      aria-label={props.label}
      title={props.tooltip || props.label}
      disabled={props.disabled}
      aria-busy={props.busy || undefined}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
