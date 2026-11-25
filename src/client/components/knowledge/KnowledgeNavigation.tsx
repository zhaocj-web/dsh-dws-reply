import React from 'react';
import { KnowledgeFileIcon } from './KnowledgeFileList';

type KnowledgeNavigationProps = {
  source: 'documents' | 'wiki';
  count: number;
  onChange: (source: 'documents' | 'wiki') => void;
};

/** 两种来源保留同一导航位置，目录展开在来源导航下方。 */
export function KnowledgeNavigation(props: KnowledgeNavigationProps) {
  return (
    <div className="dpr-knowledge-sources">
      <span className="dpr-knowledge-section-label">资料来源</span>
      <button
        type="button"
        aria-current={props.source === 'documents' ? 'page' : undefined}
        onClick={() => props.onChange('documents')}
      >
        <KnowledgeFileIcon />
        <span>已加入资料</span>
        <small>{props.count}</small>
      </button>
      <button
        type="button"
        aria-current={props.source === 'wiki' ? 'page' : undefined}
        onClick={() => props.onChange('wiki')}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M4 4h7a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4V4ZM14 7a3 3 0 0 1 3-3h4v15h-3a4 4 0 0 0-4 2" />
        </svg>
        <span>钉钉知识库</span>
      </button>
    </div>
  );
}
