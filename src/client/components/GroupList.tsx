import { ConversationRuleEditor } from './ConversationRuleEditor';
import React from 'react';
import type { ReplyStyle } from '../../shared/types';
import type { GroupCandidate, ConversationRule, ReplyModel } from '../../shared/types';
import { IconButton } from './IconButton';
import { ActionButton } from './Controls';
import { GroupInfo } from './GroupInfo';

type GroupListProps = {
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
  profiles: GroupCandidate[];
  onRemove: (id: string) => void;
};
export function GroupList(props: GroupListProps) {
  const ids = [...new Set(props.selectedIds.map((id) => id.trim()).filter(Boolean))];
  return (
    <section className="dpr-contact-list" aria-label="群聊名单">
      <div className="dpr-contact-list-heading">
        <h3>群聊名单</h3>
        <span className="dpr-help">{ids.length} 个群聊</span>
      </div>
      {ids.length === 0 ? (
        <p className="dpr-help">暂无群聊，请在上方搜索并添加。</p>
      ) : (
        <ul className="dpr-selected-contacts">
          {ids.map((id) => (
            <li key={id}>
              <div className="dpr-selected-contact-body">
                <GroupInfo
                  id={id}
                  group={props.profiles.find((group) => group.openConversationId === id)}
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
                  styles={props.styles}
                  styleId={
                    props.rules.find((rule) => rule.kind === 'group' && rule.targetId === id)
                      ?.styleId
                  }
                  name={props.profiles.find((group) => group.openConversationId === id)?.name || id}
                  value={
                    props.rules.find((rule) => rule.kind === 'group' && rule.targetId === id)
                      ?.rules || ''
                  }
                  onChange={(value, model, styleId) =>
                    props.onRuleChange(id, value, model, styleId)
                  }
                />
                <ActionButton label="移除" onClick={() => props.onRemove(id)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
