import { DialogHeader } from './DialogHeader';
import type { ModelCatalog, ReplyModel, ReplyStyle } from '../../shared/types';
import { ReplyStyleSelect } from './ReplyStyleSelect';
import { ReplyModelSelect } from './ReplyModelSelect';
import React, { useId, useRef, useState } from 'react';
import { IconButton } from './IconButton';
import { ActionButton } from './Controls';
import { FormItem, Textarea } from './Form';

type ConversationRuleEditorProps = {
  compact?: boolean;
  iconOnly?: boolean;
  styles: ReplyStyle[];
  styleId?: string | null;
  value: string;
  name: string;
  replyModel?: ReplyModel | null;
  listModels?: () => Promise<ModelCatalog>;
  onChange: (value: string, model?: ReplyModel | null, styleId?: string | null) => void;
};

/** 弹窗内独立暂存，取消不修改页面草稿；确认后仍需统一保存配置。 */
export function ConversationRuleEditor(props: ConversationRuleEditorProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [styleId, setStyleId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [model, setModel] = useState<ReplyModel | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  function open() {
    setDraft(props.value);
    setStyleId(props.styleId ?? null);
    setModel(props.replyModel ?? null);
    setIsOpen(true);
    dialog.current?.showModal();
  }
  function close() {
    dialog.current?.close();
  }
  function confirm() {
    props.onChange(draft, props.listModels ? model : undefined, styleId);
    close();
  }
  return (
    <>
      {props.iconOnly ? (
        <IconButton label={`回复规则 · ${props.name}`} tooltip="回复规则" onClick={open}>
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
            <circle cx="9" cy="6" r="2" fill="var(--card)" />
            <circle cx="15" cy="12" r="2" fill="var(--card)" />
            <circle cx="9" cy="18" r="2" fill="var(--card)" />
          </svg>
        </IconButton>
      ) : (
        <button
          type="button"
          className={props.compact ? 'dpr-text-button' : 'dpr-btn'}
          title={
            props.value.trim() || props.replyModel || props.styleId
              ? '已设置专属配置'
              : '使用公共规则'
          }
          onClick={open}
        >
          {props.compact ? '规则' : '回复规则'}
        </button>
      )}
      <dialog
        ref={dialog}
        style={{ width: 600 }}
        onClose={() => setIsOpen(false)}
        className="dpr-rule-dialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <DialogHeader onClose={close}>
          <h2 id={titleId}>回复规则 · {props.name}</h2>
        </DialogHeader>
        <div className="dpr-dialog-body dpr-stack">
          <p className="dpr-help" id={descriptionId}>
            在全局公共规则基础上补充，冲突时以此处为准。文字规则优先于风格。
          </p>
          {isOpen && props.listModels && (
            <div className="dpr-dialog-model">
              <ReplyModelSelect
                value={model}
                onChange={setModel}
                load={props.listModels}
                defaultLabel="跟随全局回复模型"
                help="仅用于此联系人的代答；不改变全局模型。"
              />
            </div>
          )}
          <ReplyStyleSelect value={styleId} styles={props.styles} inherit onChange={setStyleId} />
          <FormItem label="专属回复规则">
            <Textarea
              rows={7}
              maxLength={12000}
              value={draft}
              placeholder="设置对当前会话的称呼、语气和回答范围"
              onChange={(event) => setDraft(event.target.value)}
            />
          </FormItem>
          <p className="dpr-help">确认后更新页面草稿，点击页面底部“保存修改”后生效。</p>
        </div>
        <div className="dpr-actions dpr-dialog-footer">
          <ActionButton label="取消" onClick={close} />
          <ActionButton label="确认" onClick={confirm} primary={true} />
        </div>
      </dialog>
    </>
  );
}
