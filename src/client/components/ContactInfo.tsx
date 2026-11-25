import React from 'react';
import type { ContactCandidate } from '../../shared/types';

type ContactInfoProps = {
  contact?: ContactCandidate;
  openDingTalkId: string;
};

/** 搜索候选与已选名单共用资料展示，只展示实际返回的资料字段。 */
export function ContactInfo(props: ContactInfoProps) {
  const contact = props.contact;
  const displayName = contact?.nickname || contact?.name || props.openDingTalkId;
  return (
    <div className="dpr-contact-info">
      <div className="dpr-contact-name">
        <strong>{displayName}</strong>
        {contact?.realName && contact.realName !== displayName && <span>{contact.realName}</span>}
      </div>
      {contact && (
        <dl className="dpr-contact-details">
          {contact.company && (
            <div>
              <dt>公司</dt>
              <dd>{contact.company}</dd>
            </div>
          )}
          {contact.department && (
            <div>
              <dt>部门</dt>
              <dd>{contact.department}</dd>
            </div>
          )}
          {contact.position && (
            <div>
              <dt>职位</dt>
              <dd>{contact.position}</dd>
            </div>
          )}
          {!contact.position && !contact.company && !contact.department && contact.detail && (
            <div>
              <dt>资料</dt>
              <dd>{contact.detail}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
