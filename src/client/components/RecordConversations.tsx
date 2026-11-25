import React from 'react';
import type { RecordConversation } from '../domain/record-conversations';

type RecordConversationsProps = {
  conversations: RecordConversation[];
  selected: string;
  total: number;
  onSelect: (key: string) => void;
};
const sections = [
  { kind: 'direct', label: '联系人' },
  { kind: 'group', label: '群聊' },
  { kind: 'test', label: '模型自检' },
] as const;

export function RecordConversations(props: RecordConversationsProps) {
  return (
    <nav className="dpr-record-conversations" aria-label="按联系人和群聊查看记录">
      <button
        type="button"
        aria-current={props.selected === 'all' ? 'page' : undefined}
        onClick={() => props.onSelect('all')}
      >
        <RecordNavigationIcon kind="all" />
        <span className="dpr-record-nav-label">全部记录</span>
        <span className="dpr-record-count">{props.total}</span>
      </button>
      {sections.map((section) => {
        const conversations = props.conversations.filter((item) => item.kind === section.kind);
        if (!conversations.length) return null;
        return (
          <section key={section.kind}>
            <h2>{section.label}</h2>
            {conversations.map((conversation) => (
              <button
                type="button"
                key={conversation.key}
                title={conversation.target}
                aria-current={props.selected === conversation.key ? 'page' : undefined}
                onClick={() => props.onSelect(conversation.key)}
              >
                <RecordNavigationIcon kind={section.kind} />
                <span className="dpr-record-nav-label">{conversation.label}</span>
                <span className="dpr-record-count">{conversation.count}</span>
              </button>
            ))}
          </section>
        );
      })}
    </nav>
  );
}

type RecordNavigationIconProps = { kind: 'all' | 'direct' | 'group' | 'test' };

function RecordNavigationIcon(props: RecordNavigationIconProps) {
  return (
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
      {props.kind === 'direct' ? (
        <>
          <circle cx="12" cy="7" r="4" />
          <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
        </>
      ) : props.kind === 'group' ? (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 4v2" />
        </>
      ) : props.kind === 'test' ? (
        <>
          <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8" />
        </>
      ) : (
        <>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </>
      )}
    </svg>
  );
}
