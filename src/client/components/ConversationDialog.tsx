import React, { useEffect, useId, useLayoutEffect, useRef } from 'react';
import type { ConversationKind, PluginSnapshot, RpcRequests } from '../../shared/types';
import { IconButton } from './IconButton';
import { RecordChat } from './RecordChat';
import { ConversationComposer } from './ConversationComposer';

type ConversationDialogProps = {
  kind: ConversationKind;
  target: string;
  name: string;
  snapshot: PluginSnapshot;
  onSubmit: (payload: RpcRequests['internalChat']) => Promise<void>;
  onClose: () => void;
};

/** 对话展示该目标所有仍在本地保留的记录，不受处理记录页筛选条件影响。 */
export function ConversationDialog(props: ConversationDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const messages = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const titleId = useId();
  const records = props.snapshot.state.records.filter(
    (record) => record.kind === props.kind && record.target === props.target,
  );
  useEffect(() => {
    dialog.current?.showModal();
    if (messages.current) messages.current.scrollTop = messages.current.scrollHeight;
  }, []);
  useLayoutEffect(() => {
    if (followLatest.current && messages.current)
      messages.current.scrollTop = messages.current.scrollHeight;
  }, [records.length, records[0]?.time]);
  return (
    <dialog
      ref={dialog}
      className="dpr-rule-dialog dpr-chat-dialog"
      aria-labelledby={titleId}
      onClose={props.onClose}
    >
      <header className="dpr-chat-dialog-header">
        <div>
          <h2 id={titleId}>{props.name}</h2>
          <p className="dpr-help">
            {props.kind === 'direct' ? '私聊' : '群聊'} · {records.length} 条已保存记录
          </p>
        </div>
        <IconButton label="关闭对话" onClick={() => dialog.current?.close()}>
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
      <div
        ref={messages}
        className="dpr-chat-dialog-messages"
        onScroll={() => {
          const area = messages.current;
          if (area)
            followLatest.current = area.scrollHeight - area.scrollTop - area.clientHeight < 80;
        }}
      >
        {records.length ? (
          <div className="dpr-chat-history">
            {[...records].reverse().map((record, index) => (
              <RecordChat
                showCopy
                showTrace
                key={`${record.time}-${index}`}
                record={record}
                name={props.name}
              />
            ))}
          </div>
        ) : (
          <p className="dpr-empty">暂无记录，可以先与 AI 内部交流。</p>
        )}
      </div>
      <ConversationComposer
        kind={props.kind}
        target={props.target}
        onSubmit={async (payload) => {
          followLatest.current = true;
          await props.onSubmit(payload);
        }}
      />
    </dialog>
  );
}
