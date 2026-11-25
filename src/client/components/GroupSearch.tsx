import React from 'react';
import type { GroupCandidate, GroupSearchResult, DirectoryPage } from '../../shared/types';
import { SearchPicker } from './SearchPicker';
import { GroupInfo } from './GroupInfo';

type GroupSearchProps = {
  load: (cursor?: string) => Promise<DirectoryPage<GroupCandidate>>;
  profile: string;
  selectedIds: string[];
  search: (query: string) => Promise<GroupSearchResult>;
  onSelect: (group: GroupCandidate) => void;
};
export function GroupSearch(props: GroupSearchProps) {
  return (
    <SearchPicker<GroupCandidate>
      load={props.load}
      profile={props.profile}
      selectedIds={props.selectedIds}
      onSelect={props.onSelect}
      label="搜索群聊"
      placeholder="输入群名称关键词"
      search={async (query) => {
        const result = await props.search(query);
        return {
          items: result.groups,
          omitted: result.omitted,
          notice: result.complete
            ? undefined
            : `当前结果不完整${result.failedCount ? `，${result.failedCount} 项查询失败` : ''}；请使用更完整的群名缩小范围。${result.stopReason ? `（${result.stopReason}）` : ''}`,
        };
      }}
      getId={(group) => group.openConversationId}
      renderItem={(group) => <GroupInfo group={group} id={group.openConversationId} />}
    />
  );
}
