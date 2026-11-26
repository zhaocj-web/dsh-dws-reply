import React, { createContext, useContext, useRef, useState } from 'react';
import type { ProcessingRecord, RpcRequests } from '../../shared/types';
import { ActionButton } from './Controls';
import { errorMessage } from '../../shared/errors';

type SendDraft = (request: RpcRequests['sendDraft']) => Promise<void>;
export const SendDraftContext = createContext<SendDraft | null>(null);
type SendDraftButtonProps = { record: ProcessingRecord };

/** 只向后端提交草稿标识，保持正文原样；提交期间禁止重复点击。 */
export function SendDraftButton(props: SendDraftButtonProps) {
  const send = useContext(SendDraftContext);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const record = props.record;
  if (
    !send ||
    record.status !== 'draft' ||
    record.origin === 'owner' ||
    record.inProgress ||
    record.kind === 'test' ||
    !record.answer?.trim()
  )
    return null;
  const submit = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await send({
        kind: record.kind as 'direct' | 'group',
        target: record.target,
        time: record.time,
      });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="dpr-draft-send">
      <ActionButton
        label={busy ? '发送中…' : '发送'}
        disabled={busy}
        onClick={() => void submit()}
      />
      {error && (
        <p className="dpr-help" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
