import React, { useState } from 'react';
import { FormItem, Input, Textarea } from '../Form';
import { ActionButton } from '../Controls';
import { errorMessage } from '../../../shared/errors';
import type { KnowledgeDocument } from '../../../shared/knowledge';

type KnowledgeEditorProps = {
  document?: KnowledgeDocument;
  onSave: (document: KnowledgeDocument) => void;
  onClose: () => void;
};

export function KnowledgeEditor(props: KnowledgeEditorProps) {
  const [title, setTitle] = useState(props.document?.title ?? '');
  const [content, setContent] = useState(props.document?.content ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function importFile(file?: File) {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      if (!/\.(md|txt|markdown)$/i.test(file.name) || file.size > 400000)
        throw new Error('请选择 400 KB 以内的 UTF-8 文本或 Markdown 文件');
      const text = await file.text();
      if (!text.trim() || text.length > 100000 || text.includes('\u0000'))
        throw new Error('正文为空、超过 10 万字符或不是文本文件');
      setTitle(file.name.replace(/\.[^.]+$/, '').slice(0, 200));
      setContent(text);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  function save() {
    setError('');
    try {
      props.onSave({
        id: props.document?.id ?? crypto.randomUUID(),
        title,
        content,
        enabled: props.document?.enabled ?? true,
        source: 'local',
        ...(props.document?.folder ? { folder: props.document.folder } : {}),
        updatedAt: new Date().toISOString(),
      });
      props.onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  return (
    <div className="dpr-dialog-form">
      <div className="dpr-dialog-body dpr-stack">
        <FormItem
          label="导入文件"
          help="支持 .txt、.md；也可直接粘贴内容，按“问题 / 答案”维护问答。"
        >
          <Input
            type="file"
            accept=".txt,.md,.markdown"
            disabled={busy}
            onChange={(event) => {
              void importFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </FormItem>
        <FormItem label="标题">
          <Input
            value={title}
            maxLength={200}
            disabled={busy}
            onChange={(event) => setTitle(event.target.value)}
          />
        </FormItem>
        <FormItem label="正文">
          <Textarea
            rows={10}
            value={content}
            maxLength={100000}
            disabled={busy}
            onChange={(event) => setContent(event.target.value)}
          />
        </FormItem>
        {error && (
          <p role="alert" className="dpr-error">
            {error}
          </p>
        )}
      </div>
      <div className="dpr-actions dpr-dialog-footer">
        <ActionButton label="加入草稿" primary disabled={busy} onClick={save} />
        <ActionButton label="取消" disabled={busy} onClick={props.onClose} />
      </div>
    </div>
  );
}
