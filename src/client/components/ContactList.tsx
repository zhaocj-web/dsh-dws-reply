import { ConversationRuleEditor } from './ConversationRuleEditor';
import React from 'react';
import type { ReplyStyle } from '../../shared/types';
import type {
  ContactCandidate,
  ConversationRule,
  ReplyModel,
  ModelCatalog,
} from '../../shared/types';
import { ContactInfo } from './ContactInfo';
import { IconButton } from './IconButton';

type ContactListProps = {
  selectedIds: string[];
  onChat: (id: string) => void;
  styles: ReplyStyle[];
  rules: ConversationRule[];
  onRuleChange: (
    id: string,
    value: string,
    model?: ReplyModel | null,
    styleId?: string | null,
  ) => void;
  listModels: () => Promise<ModelCatalog>;
  profiles: ContactCandidate[];
  onRemove: (openDingTalkId: string) => void;
};

export function ContactList(props: ContactListProps) {
  const ids = [...new Set(props.selectedIds.map((id) => id.trim()).filter(Boolean))];
  return (
    <section className="dpr-contact-list" aria-label="联系人名单">
      <div className="dpr-contact-list-heading">
        <h3>联系人名单</h3>
        <span className="dpr-help">{ids.length} 位联系人</span>
      </div>
      {ids.length === 0 ? (
        <p className="dpr-help">暂无联系人，请在上方搜索并添加。</p>
      ) : (
        <ul className="dpr-selected-contacts">
          {ids.map((id) => (
            <li key={id}>
              <div className="dpr-selected-contact-body dpr-contact-with-icon">
                <span className="dpr-contact-leading-icon" aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
                  </svg>
                </span>
                <ContactInfo
                  contact={props.profiles.find((contact) => contact.openDingTalkId === id)}
                  openDingTalkId={id}
                />
              </div>
              <div className="dpr-selected-contact-actions">
                <IconButton label="打开对话" tooltip="对话" onClick={() => props.onChat(id)}>
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
                    <path d="M4 4h16v12H9l-5 4V4Z" />
                    <path d="M8 8h8M8 12h5" />
                  </svg>
                </IconButton>
                <ConversationRuleEditor
                  iconOnly
                  styles={props.styles}
                  styleId={
                    props.rules.find((rule) => rule.kind === 'direct' && rule.targetId === id)
                      ?.styleId
                  }
                  listModels={props.listModels}
                  replyModel={
                    props.rules.find((rule) => rule.kind === 'direct' && rule.targetId === id)
                      ?.replyModel
                  }
                  name={
                    props.profiles.find((contact) => contact.openDingTalkId === id)?.nickname ||
                    props.profiles.find((contact) => contact.openDingTalkId === id)?.name ||
                    id
                  }
                  value={
                    props.rules.find((rule) => rule.kind === 'direct' && rule.targetId === id)
                      ?.rules || ''
                  }
                  onChange={(value, model, styleId) =>
                    props.onRuleChange(id, value, model, styleId)
                  }
                />
                <IconButton
                  label="移除联系人"
                  tooltip="移除联系人"
                  onClick={() => props.onRemove(id)}
                >
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
                    <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" />
                  </svg>
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
