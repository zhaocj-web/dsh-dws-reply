import React, { useEffect, useId, useRef, useState } from 'react';
import type {
  KnowledgeDocument,
  KnowledgeRequest,
  KnowledgeResult,
} from '../../../shared/knowledge';
import { errorMessage } from '../../../shared/errors';
import { ActionButton } from '../Controls';
import { IconButton } from '../IconButton';
import { CopyButton } from '../CopyButton';

type KnowledgePreviewProps = {
  title: string;
  document?: KnowledgeDocument;
  node?: string;
  queryKnowledge?: (params: KnowledgeRequest) => Promise<KnowledgeResult>;
  onAdd?: (document: KnowledgeDocument) => void;
  onClose: () => void;
};

/** 预览只读；正文按文本展示，避免执行文档中的 HTML 或外部资源。 */
export function KnowledgePreview(props: KnowledgePreviewProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [document, setDocument] = useState(props.document);
  const [loading, setLoading] = useState(!props.document);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    if (props.document) return;
    let active = true;
    setLoading(true);
    setError('');
    async function load() {
      try {
        if (!props.node || !props.queryKnowledge) throw new Error('文档预览参数无效');
        const result = await props.queryKnowledge({ action: 'fetch', node: props.node });
        if (!result.document) throw new Error('未返回文档正文');
        if (active) setDocument(result.document);
      } catch (failure) {
        if (active) setError(errorMessage(failure));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [props.node, props.document, props.queryKnowledge, retry]);
  function add() {
    if (!document || !props.onAdd) return;
    try {
      props.onAdd(document);
      setAdded(true);
      setError('');
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  return (
    <dialog
      ref={dialog}
      className="dpr-rule-dialog dpr-knowledge-preview"
      aria-labelledby={titleId}
      onClose={props.onClose}
    >
      <header className="dpr-chat-dialog-header">
        <h2 id={titleId}>{document?.title ?? props.title}</h2>
        <IconButton label="关闭预览" onClick={() => dialog.current?.close()}>
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
      <div className="dpr-knowledge-preview-body" aria-busy={loading}>
        {loading && (
          <p role="status" className="dpr-help">
            正在读取文档…
          </p>
        )}
        {error && (
          <div className="dpr-stack">
            <p role="alert" className="dpr-error">
              {error}
            </p>
            {!document && <ActionButton label="重新加载" onClick={() => setRetry(retry + 1)} />}
          </div>
        )}
        {document && <div className="dpr-knowledge-preview-text">{document.content}</div>}
      </div>
      <footer className="dpr-knowledge-preview-footer">
        <span className="dpr-help" role="status">
          {added
            ? '已加入草稿，保存修改后生效。'
            : document
              ? `${document.content.length.toLocaleString()} 字符 · 文本预览`
              : ''}
        </span>
        <div className="dpr-knowledge-actions">
          {document && <CopyButton text={document.content} label="复制文档正文" />}
          {props.onAdd && (
            <ActionButton
              label={added ? '已加入' : '加入资料库'}
              primary
              disabled={loading || !document || added}
              onClick={add}
            />
          )}
        </div>
      </footer>
    </dialog>
  );
}
