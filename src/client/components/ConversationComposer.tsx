import { shouldSubmitConversation } from '../domain/composer-keyboard';
import React, { useRef, useState } from 'react';
import type { ConversationKind, RpcRequests } from '../../shared/types';
import { errorMessage } from '../../shared/errors';
import { FormItem, Textarea } from './Form';
import { ActionButton } from './Controls';

type ConversationComposerProps = {
  kind: ConversationKind;
  target: string;
  onSubmit: (payload: RpcRequests['internalChat']) => Promise<void>;
};

/** 输入是账号主人给模型的内部指令，发送目标由当前选中的会话固定。 */
export function ConversationComposer(props: ConversationComposerProps) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const request = useRef<RpcRequests['internalChat']>();
  async function submit() {
    if (!text.trim() || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const payload =
      request.current?.text === text
        ? request.current
        : {
            kind: props.kind,
            target: props.target,
            text,
            requestId: crypto.randomUUID(),
          };
    request.current = payload;
    try {
      await props.onSubmit(payload);
      setText('');
      request.current = undefined;
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="dpr-conversation-composer"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <FormItem label="与 AI 内部交流" hideLabel error={error}>
        <Textarea
          rows={3}
          maxLength={12000}
          value={text}
          disabled={busy}
          placeholder="补充背景、调整语气，或让 AI 重新组织回复…"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (
              shouldSubmitConversation({
                key: event.key,
                shiftKey: event.shiftKey,
                altKey: event.altKey,
                isComposing: event.nativeEvent.isComposing,
                keyCode: event.nativeEvent.keyCode,
                repeat: event.repeat,
              })
            ) {
              event.preventDefault();
              void submit();
            }
          }}
        />
      </FormItem>
      <div className="dpr-composer-actions">
        <span className="dpr-help" aria-live="polite">
          {busy
            ? 'AI 正在处理内部指令…'
            : 'Enter 发送给 AI · Shift+Enter 换行 · AI 根据对话意图执行发送或调整规则'}
        </span>
        <ActionButton
          label={busy ? '生成中…' : '发送给 AI'}
          disabled={busy || !text.trim()}
          primary
          onClick={() => void submit()}
        />
      </div>
    </form>
  );
}
