import React, { createContext, useContext, useEffect, useRef, useState, useId } from 'react';
import type { MessageImagesResult, ProcessingRecord, RpcClient } from '../../shared/types';
import { DialogHeader } from './DialogHeader';

export const MessageImagesContext = createContext<RpcClient | null>(null);
type MessageImagesProps = { record: ProcessingRecord };

export function MessageImages(props: MessageImagesProps) {
  const rpc = useContext(MessageImagesContext);
  const container = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [visible, setVisible] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [images, setImages] = useState<MessageImagesResult['images']>([]);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState('');
  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || !rpc) return;
    let active = true;
    setError(false);
    void rpc
      .call<MessageImagesResult>('/api', 'dws-personal.messageImages', {
        kind: props.record.kind,
        target: props.record.target,
        time: props.record.time,
      })
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.value.images.length) setError(true);
        else setImages(result.value.images);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [visible, rpc, props.record.kind, props.record.target, props.record.time, attempt]);
  return (
    <div ref={container} className="dpr-message-images">
      {images.map((image, index) => (
        <button
          type="button"
          className="dpr-message-image"
          key={image.id}
          aria-label={`放大查看图片 ${index + 1}`}
          onClick={() => {
            setSelected(image.dataUrl);
            dialog.current?.showModal();
          }}
        >
          <img src={image.dataUrl} alt={`来信图片 ${index + 1}`} onError={() => setError(true)} />
        </button>
      ))}
      {!images.length && (
        <span className="dpr-help" role="status">
          {error ? '图片暂不可用' : '正在加载图片…'}
        </span>
      )}
      {error && props.record.messageId && (
        <button
          type="button"
          className="dpr-text-button"
          onClick={() => setAttempt((value) => value + 1)}
        >
          重新加载
        </button>
      )}
      <dialog
        ref={dialog}
        className="dpr-rule-dialog dpr-image-preview"
        style={{ width: 860 }}
        aria-labelledby={titleId}
        onClose={(event) => event.stopPropagation()}
        onCancel={(event) => event.stopPropagation()}
      >
        <DialogHeader closeLabel="关闭图片预览" onClose={() => dialog.current?.close()}>
          <h2 id={titleId}>图片预览</h2>
        </DialogHeader>
        <div className="dpr-dialog-body">
          {selected && <img src={selected} alt="来信图片预览" />}
        </div>
      </dialog>
    </div>
  );
}
