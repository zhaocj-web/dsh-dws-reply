import React from 'react';
import type {
  ContactCandidate,
  ContactSearchResult,
  ConversationKind,
  DirectoryPage,
  GroupCandidate,
  GroupSearchResult,
  ModelCatalog,
  ReplyConfig,
  ReplyModel,
} from '../../shared/types';
import { ContactSearch } from './ContactSearch';
import { ContactList } from './ContactList';
import { GroupSearch } from './GroupSearch';
import { GroupList } from './GroupList';
type ConversationPickerProps = {
  kind: ConversationKind;
  onChat: (id: string) => void;
  config: ReplyConfig;
  listContacts: (cursor?: string) => Promise<DirectoryPage<ContactCandidate>>;
  listGroups: (cursor?: string) => Promise<DirectoryPage<GroupCandidate>>;
  searchContacts: (query: string) => Promise<ContactSearchResult>;
  searchGroups: (query: string) => Promise<GroupSearchResult>;
  listModels: () => Promise<ModelCatalog>;
  updateConfig: <K extends keyof ReplyConfig>(key: K, value: ReplyConfig[K]) => void;
  onRuleChange: (
    id: string,
    value: string,
    model?: ReplyModel | null,
    styleId?: string | null,
  ) => void;
};

/** 候选列表与已选名单上下排列，搜索和浏览共用同一添加入口。 */
export function ConversationPicker(props: ConversationPickerProps) {
  function setContacts(items: ContactCandidate[]) {
    props.updateConfig(
      'directIds',
      items.map((item) => item.openDingTalkId),
    );
    props.updateConfig('contactProfiles', items);
  }
  function setGroups(items: GroupCandidate[]) {
    props.updateConfig(
      'groupIds',
      items.map((item) => item.openConversationId),
    );
    props.updateConfig('groupProfiles', items);
  }
  if (props.kind === 'direct') {
    const selected = props.config.directIds.map(
      (id) =>
        props.config.contactProfiles.find((item) => item.openDingTalkId === id) || {
          openDingTalkId: id,
          name: id,
          detail: '',
        },
    );
    return (
      <div className="dpr-stack">
        <ContactSearch
          profile={props.config.profile}
          selectedIds={props.config.directIds}
          search={props.searchContacts}
          load={props.listContacts}
          onSelect={(item) =>
            setContacts([
              ...selected.filter((entry) => entry.openDingTalkId !== item.openDingTalkId),
              item,
            ])
          }
        />
        <ContactList
          onChat={props.onChat}
          styles={props.config.replyStyles}
          selectedIds={props.config.directIds}
          profiles={props.config.contactProfiles}
          rules={props.config.conversationRules}
          listModels={props.listModels}
          onRuleChange={props.onRuleChange}
          onRemove={(id) => setContacts(selected.filter((item) => item.openDingTalkId !== id))}
        />
      </div>
    );
  }
  const selected = props.config.groupIds.map(
    (id) =>
      props.config.groupProfiles.find((item) => item.openConversationId === id) || {
        openConversationId: id,
        name: '',
      },
  );
  return (
    <div className="dpr-stack">
      <GroupSearch
        profile={props.config.profile}
        selectedIds={props.config.groupIds}
        search={props.searchGroups}
        load={props.listGroups}
        onSelect={(item) =>
          setGroups([
            ...selected.filter((entry) => entry.openConversationId !== item.openConversationId),
            item,
          ])
        }
      />
      <GroupList
        onChat={props.onChat}
        styles={props.config.replyStyles}
        selectedIds={props.config.groupIds}
        profiles={props.config.groupProfiles}
        rules={props.config.conversationRules}
        onRuleChange={props.onRuleChange}
        onRemove={(id) => setGroups(selected.filter((item) => item.openConversationId !== id))}
      />
    </div>
  );
}
