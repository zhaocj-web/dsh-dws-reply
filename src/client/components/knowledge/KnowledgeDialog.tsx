import React, { useEffect, useId, useRef } from 'react';
import { IconButton } from '../IconButton';

type KnowledgeDialogProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  compact?: boolean;
};

export function KnowledgeDialog(props: KnowledgeDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`dpr-rule-dialog dpr-knowledge-edit-dialog${props.compact ? ' dpr-knowledge-edit-compact' : ''}`}
      aria-labelledby={titleId}
      onClose={props.onClose}
    >
      <header className="dpr-chat-dialog-header">
        <h2 id={titleId}>{props.title}</h2>
        <IconButton label="关闭" onClick={() => dialog.current?.close()}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </IconButton>
      </header>
      <div className="dpr-knowledge-edit-body">{props.children}</div>
    </dialog>
  );
}
