import React from 'react';
import type { GroupCandidate } from '../../shared/types';

type GroupInfoProps = { group?: GroupCandidate; id: string };
export function GroupInfo(props: GroupInfoProps) {
  return (
    <div className="dpr-contact-info">
      <div className="dpr-contact-name">
        <strong>{props.group?.name || '群聊'}</strong>
      </div>
      <p className="dpr-help">{props.id}</p>
    </div>
  );
}
