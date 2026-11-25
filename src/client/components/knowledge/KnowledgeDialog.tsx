import React, { useEffect, useId, useRef } from 'react';
import { DialogHeader } from '../DialogHeader';

type KnowledgeDialogProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width: number;
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
      className="dpr-rule-dialog dpr-knowledge-edit-dialog"
      style={{ width: props.width }}
      aria-labelledby={titleId}
      onClose={props.onClose}
    >
      <DialogHeader closeLabel="关闭" onClose={() => dialog.current?.close()}>
        <h2 id={titleId}>{props.title}</h2>
      </DialogHeader>
      <div className="dpr-knowledge-edit-body">{props.children}</div>
    </dialog>
  );
}
