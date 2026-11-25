import React, { useEffect, useId, useLayoutEffect, useRef } from 'react';
import type { ConversationKind, PluginSnapshot, RpcRequests } from '../../shared/types';
import { DialogHeader } from './DialogHeader';
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
      style={{ width: 860 }}
      className="dpr-rule-dialog dpr-chat-dialog"
      aria-labelledby={titleId}
      onClose={props.onClose}
    >
      <DialogHeader closeLabel="关闭对话" onClose={() => dialog.current?.close()}>
        <div>
          <h2 id={titleId}>{props.name}</h2>
          <p className="dpr-help">
            {props.kind === 'direct' ? '私聊' : '群聊'} · {records.length} 条已保存记录
          </p>
        </div>
      </DialogHeader>
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
