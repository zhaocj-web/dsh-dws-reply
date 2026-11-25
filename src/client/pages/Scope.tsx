import { ConversationDialog } from '../components/ConversationDialog';
import React, { useState } from 'react';
import type {
  ContactCandidate,
  ContactSearchResult,
  ConversationKind,
  DirectoryPage,
  GroupCandidate,
  GroupSearchResult,
  ModelCatalog,
  ReplyConfig,
  PluginSnapshot,
  RpcRequests,
  ReplyPolicy,
  ReplyModel,
} from '../../shared/types';
import { RadioFormItem } from '../components/Form';
import { ConversationPicker } from '../components/ConversationPicker';
import { editConversationRule } from '../domain/edit-conversation-rule';

type ScopeProps = {
  snapshot: PluginSnapshot;
  chatWithModel: (payload: RpcRequests['internalChat']) => Promise<void>;
  listModels: () => Promise<ModelCatalog>;
  draftConfig: ReplyConfig;
  updateConfig: <K extends keyof ReplyConfig>(key: K, value: ReplyConfig[K]) => void;
  listContacts: (cursor?: string) => Promise<DirectoryPage<ContactCandidate>>;
  listGroups: (cursor?: string) => Promise<DirectoryPage<GroupCandidate>>;
  searchGroups: (query: string) => Promise<GroupSearchResult>;
  searchContacts: (query: string) => Promise<ContactSearchResult>;
};

export function Scope(props: ScopeProps) {
  const [chat, setChat] = useState<{ kind: ConversationKind; target: string } | null>(null);
  const [kind, setKind] = useState<ConversationKind>('direct');
  function updateRule(
    id: string,
    value: string,
    replyModel?: ReplyModel | null,
    styleId?: string | null,
  ): void {
    props.updateConfig(
      'conversationRules',
      editConversationRule({
        rules: props.draftConfig.conversationRules ?? [],
        kind,
        targetId: id,
        value,
        replyModel,
        styleId,
      }),
    );
  }
  return (
    <div className="dpr-scope-page">
      <div className="dpr-scope-stack">
        <nav className="dpr-scope-nav" aria-label="会话类型">
          {(['direct', 'group'] as const).map((item) => (
            <button
              type="button"
              key={item}
              aria-current={kind === item ? 'page' : undefined}
              onClick={() => setKind(item)}
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
                {item === 'direct' ? (
                  <>
                    <circle cx="12" cy="7" r="4" />
                    <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                  </>
                ) : (
                  <>
                    <circle cx="9" cy="8" r="3" />
                    <path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 4v2" />
                  </>
                )}
              </svg>
              <span>{item === 'direct' ? '联系人' : '群聊'}</span>
              <span className="dpr-scope-count">{props.draftConfig[`${item}Ids`].length}</span>
            </button>
          ))}
        </nav>
        <section className="dpr-scope-content" aria-label="回复范围与名单">
          <RadioFormItem<ReplyPolicy>
            label="回复范围"
            value={props.draftConfig[`${kind}Policy`]}
            onChange={(value) => props.updateConfig(`${kind}Policy`, value)}
            options={[
              { value: 'off', label: '关闭' },
              { value: 'allowlist', label: '仅指定名单' },
              { value: 'all', label: kind === 'direct' ? '全部私聊' : '所有群里的 @我' },
            ]}
          />
          <ConversationPicker
            onChat={(target) => setChat({ kind, target })}
            key={kind}
            kind={kind}
            config={props.draftConfig}
            listContacts={props.listContacts}
            listGroups={props.listGroups}
            searchContacts={props.searchContacts}
            searchGroups={props.searchGroups}
            listModels={props.listModels}
            updateConfig={props.updateConfig}
            onRuleChange={updateRule}
          />
        </section>
      </div>
      {chat && (
        <ConversationDialog
          kind={chat.kind}
          target={chat.target}
          snapshot={props.snapshot}
          name={
            chat.kind === 'direct'
              ? props.draftConfig.contactProfiles.find(
                  (item) => item.openDingTalkId === chat.target,
                )?.nickname ||
                props.draftConfig.contactProfiles.find(
                  (item) => item.openDingTalkId === chat.target,
                )?.name ||
                chat.target
              : props.draftConfig.groupProfiles.find(
                  (item) => item.openConversationId === chat.target,
                )?.name || chat.target
          }
          onSubmit={props.chatWithModel}
          onClose={() => setChat(null)}
        />
      )}
    </div>
  );
}
