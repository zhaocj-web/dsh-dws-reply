import { DialogHeader } from '../DialogHeader';
import React, { useEffect, useId, useRef, useState } from 'react';
import type { Endpoint, ModelCatalog, PluginSnapshot, ReplyConfig } from '../../../shared/types';
import { ActionButton } from '../Controls';
import { RuntimeSettings } from './RuntimeSettings';
import { ReplySettings } from './ReplySettings';
import { AccountSettings } from './AccountSettings';

type SettingsDialogProps = {
  snapshot: PluginSnapshot;
  draftConfig: ReplyConfig;
  normalizedConfig: ReplyConfig;
  hasUnsavedChanges: boolean;
  isBusy: boolean;
  error: string;
  notice: string;
  listModels: () => Promise<ModelCatalog>;
  updateConfig: <K extends keyof ReplyConfig>(key: K, value: ReplyConfig[K]) => void;
  performAction: (endpoint: Endpoint, payload?: unknown) => Promise<void>;
  onClose: () => void;
};
type SettingsSection = 'runtime' | 'reply' | 'account';
const sections: Array<[SettingsSection, string]> = [
  ['runtime', '通用设置'],
  ['reply', '回复设置'],
  ['account', '钉钉账号'],
];

/** 和主页面共用草稿；关闭只收起弹窗，未保存的修改继续保留。 */
export function SettingsDialog(props: SettingsDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [section, setSection] = useState<SettingsSection>('runtime');
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      style={{ width: 800 }}
      className="dpr-settings-dialog"
      aria-labelledby={titleId}
      onClose={props.onClose}
    >
      <DialogHeader
        closeLabel="关闭设置"
        onClose={() => dialog.current?.close()}
        actions={
          <ActionButton
            label="打开配置文件"
            disabled={props.isBusy}
            onClick={() => props.performAction('openConfigDirectory')}
          />
        }
      >
        <h2 id={titleId}>设置</h2>
      </DialogHeader>
      <nav className="dpr-settings-nav" aria-label="设置分类">
        {sections.map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-current={section === id ? 'page' : undefined}
            onClick={() => setSection(id)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {id === 'account' ? (
                <>
                  <circle cx="12" cy="7" r="4" />
                  <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                </>
              ) : id === 'reply' ? (
                <>
                  <path d="M4 4h16v12H9l-5 4V4Z" />
                  <path d="M8 8h8M8 12h5" />
                </>
              ) : (
                <>
                  <path d="M4 6h16M4 12h16M4 18h16" />
                  <circle cx="9" cy="6" r="2" fill="var(--card)" />
                  <circle cx="15" cy="12" r="2" fill="var(--card)" />
                  <circle cx="9" cy="18" r="2" fill="var(--card)" />
                </>
              )}
            </svg>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div key={section} className="dpr-settings-body">
        {section === 'runtime' && <RuntimeSettings {...props} />}
        {section === 'reply' && <ReplySettings {...props} />}
        {section === 'account' && <AccountSettings {...props} />}
      </div>
      <footer className="dpr-settings-footer">
        <div className="dpr-settings-notice" aria-live="polite">
          {props.error ? (
            <span className="dpr-error" role="alert">
              {props.error}
            </span>
          ) : (
            props.notice ||
            (props.hasUnsavedChanges ? '有未保存的修改，关闭后保留。' : '所有设置已保存。')
          )}
        </div>

        <ActionButton
          label={props.isBusy ? '处理中…' : '保存修改'}
          primary
          disabled={props.isBusy || !props.hasUnsavedChanges}
          onClick={() => props.performAction('save', props.normalizedConfig)}
        />
      </footer>
    </dialog>
  );
}
