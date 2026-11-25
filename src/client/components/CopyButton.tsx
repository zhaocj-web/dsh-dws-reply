import React, { useState } from 'react';
import { IconButton } from './IconButton';

type CopyButtonProps = { text: string; label?: string };

/** 仅在用户点击时写入剪贴板；失败保留正文，供手动选择复制。 */
export function CopyButton(props: CopyButtonProps) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function copy() {
    setBusy(true);
    setStatus('');
    try {
      await navigator.clipboard.writeText(props.text);
      setStatus('已复制');
    } catch {
      setStatus('复制失败，请选中文字手动复制');
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="dpr-copy-action">
      <IconButton
        label={props.label ?? '复制'}
        disabled={busy || !props.text}
        busy={busy}
        onClick={() => void copy()}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="8" y="8" width="12" height="13" rx="2" />
          <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
        </svg>
      </IconButton>
      <span className="dpr-help" role="status">
        {status}
      </span>
    </span>
  );
}
