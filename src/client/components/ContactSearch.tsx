import React from 'react';
import type { ContactCandidate, ContactSearchResult, DirectoryPage } from '../../shared/types';
import { ContactInfo } from './ContactInfo';
import { SearchPicker } from './SearchPicker';

type ContactSearchProps = {
  load: (cursor?: string) => Promise<DirectoryPage<ContactCandidate>>;
  search: (query: string) => Promise<ContactSearchResult>;
  onSelect: (contact: ContactCandidate) => void;
  selectedIds?: string[];
  profile: string;
};

export function ContactSearch(props: ContactSearchProps) {
  return (
    <SearchPicker<ContactCandidate>
      load={props.load}
      profile={props.profile}
      selectedIds={props.selectedIds}
      onSelect={props.onSelect}
      label="搜索联系人"
      placeholder="输入钉钉昵称或姓名"
      search={async (query) => {
        const result = await props.search(query);
        return { items: result.contacts, omitted: result.omitted };
      }}
      getId={(contact) => contact.openDingTalkId}
      renderItem={(contact) => (
        <ContactInfo contact={contact} openDingTalkId={contact.openDingTalkId} />
      )}
    />
  );
}
