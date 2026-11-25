import React, { useEffect, useId, useRef, useState } from 'react';
import type { ReplyStyle } from '../../shared/types';
import { ActionButton } from './Controls';
import { FormGrid, FormItem, Input, Textarea } from './Form';

type StyleEditorProps = {
  style: ReplyStyle;
  onSave: (style: ReplyStyle) => void;
  onClose: () => void;
};

/** 弹窗修改独立暂存，取消不影响页面草稿。 */
export function StyleEditor(props: StyleEditorProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [draft, setDraft] = useState(props.style);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function update(key: keyof ReplyStyle, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  return (
    <dialog
      ref={dialog}
      className="dpr-rule-dialog"
      aria-labelledby={titleId}
      onClose={props.onClose}
    >
      <h2 id={titleId}>编辑风格</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          props.onSave({
            ...draft,
            name: draft.name.trim(),
            instructions: draft.instructions.trim(),
          });
        }}
      >
        <div className="dpr-stack">
          <FormGrid>
            <FormItem label="名称">
              <Input
                required
                maxLength={40}
                value={draft.name}
                onChange={(event) => update('name', event.target.value)}
              />
            </FormItem>
            <FormItem label="图标">
              <Input
                maxLength={16}
                value={draft.icon}
                onChange={(event) => update('icon', event.target.value)}
              />
            </FormItem>
          </FormGrid>
          <FormItem label="一句话概括">
            <Input
              maxLength={160}
              value={draft.summary}
              onChange={(event) => update('summary', event.target.value)}
            />
          </FormItem>
          <FormItem label="表达规则">
            <Textarea
              required
              rows={5}
              maxLength={4000}
              placeholder="语气、句式、常用词，以及避免的表达"
              value={draft.instructions}
              onChange={(event) => update('instructions', event.target.value)}
            />
          </FormItem>
          <FormItem label="回复示例" tooltip="仅用于卡片预览，不会发送或作为聊天事实提供给模型。">
            <Textarea
              rows={2}
              maxLength={500}
              value={draft.sample}
              onChange={(event) => update('sample', event.target.value)}
            />
          </FormItem>
          <div className="dpr-actions dpr-dialog-actions">
            <ActionButton label="取消" onClick={() => dialog.current?.close()} />
            <button
              className="dpr-btn dpr-btn-primary"
              type="submit"
              disabled={!draft.name.trim() || !draft.instructions.trim()}
            >
              确认
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
