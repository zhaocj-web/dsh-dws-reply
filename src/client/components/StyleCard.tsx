import React from 'react';
import type { ReplyStyle } from '../../shared/types';

type StyleCardProps = {
  style: ReplyStyle;
  active: boolean;
  custom: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
};
export function StyleCard(props: StyleCardProps) {
  return (
    <article className={`dpr-style-card${props.active ? ' is-active' : ''}`}>
      <header>
        <span
          className={`dpr-style-icon tone-${props.style.category === '工作' ? 'work' : 'daily'}`}
          aria-hidden="true"
        >
          {props.style.icon || '✦'}
        </span>
        <div className="dpr-style-card-name">
          <div className="dpr-style-title-row">
            <h3>{props.style.name}</h3>
            <span className="dpr-style-category">
              {props.custom ? '自定义' : props.style.category}
            </span>
          </div>
          {props.style.summary && <p className="dpr-style-summary">{props.style.summary}</p>}
        </div>
        {props.active && (
          <span className="dpr-style-selected-mark" title="全局已选" aria-label="全局已选">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
          </span>
        )}
      </header>
      {props.style.sample && (
        <div className="dpr-style-preview">
          <span>回复示例</span>
          <blockquote>{props.style.sample}</blockquote>
        </div>
      )}
      <footer>
        <button
          className={props.active ? 'dpr-btn dpr-btn-primary' : 'dpr-btn'}
          type="button"
          title={props.active ? '点击取消全局风格' : '保存后作为全局回复风格'}
          aria-pressed={props.active}
          onClick={props.onSelect}
        >
          {props.active ? '取消全局选择' : '使用风格'}
        </button>
        <div className="dpr-style-card-actions">
          <button
            className="dpr-text-button"
            type="button"
            onClick={props.onEdit}
            aria-label={`${props.custom ? '编辑' : '自定义'}${props.style.name}`}
          >
            {props.custom ? '编辑' : '自定义'}
          </button>
          {props.custom && (
            <button
              className="dpr-text-button"
              type="button"
              onClick={props.onDelete}
              aria-label={`删除${props.style.name}`}
            >
              删除
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}
