import { SendDraftButton } from './SendDraftButton';
import { MarkdownMessage } from './MarkdownMessage';
import { MessageText } from './MessageText';
import { MessageImages } from './MessageImages';
import { messageContent } from '../domain/message-content';
import { CopyButton } from './CopyButton';
import React from 'react';
import type { ProcessingRecord } from '../../shared/types';
import { labels } from '../view-metadata';
import { RecordTrace } from './RecordTrace';

type RecordChatProps = {
  record: ProcessingRecord;
  name: string;
  showTrace?: boolean;
  showCopy?: boolean;
};

/** 只展示实际保存的来信与回复；草稿、跳过和失败不伪装为已发送消息。 */
export function RecordChat(props: RecordChatProps) {
  const record = props.record;
  const content =
    record.origin === 'owner'
      ? { text: record.input ?? '', hasImages: false }
      : messageContent(record.input ?? '');
  return (
    <article className="dpr-chat-turn">
      <div className="dpr-chat-time">
        <time dateTime={record.time}>{new Date(record.time).toLocaleString()}</time>
        {record.kind === 'group' && <span>{props.name} · 群聊</span>}
      </div>
      <div className="dpr-chat-message dpr-chat-incoming">
        <span className="dpr-chat-speaker">
          {record.origin === 'owner'
            ? '我 · 内部指令'
            : record.kind === 'group'
              ? record.sender
              : props.name}
          {props.showCopy && record.input && (
            <CopyButton text={content.text || '图片'} label="复制来信或内部指令" />
          )}
        </span>
        <div className="dpr-chat-bubble">
          <MessageText
            text={
              content.text ||
              (!content.hasImages
                ? record.kind === 'test'
                  ? '本地模型自检'
                  : '这条历史记录未保存来信内容。'
                : '')
            }
          />
          {content.hasImages && <MessageImages record={record} />}
        </div>
      </div>
      <div className="dpr-chat-message dpr-chat-assistant">
        <div className="dpr-chat-speaker">
          <strong>AI 代答</strong>
          <span className="dpr-badge">
            {record.inProgress
              ? '处理中 · 尚未完成'
              : record.origin === 'owner' && record.status === 'draft'
                ? '内部回复 · 未发送'
                : labels[record.status] || record.status}
          </span>
          <SendDraftButton record={record} />
          {props.showCopy && (record.answer || record.error) && (
            <CopyButton text={record.answer || record.error!} label="复制回复内容" />
          )}
        </div>
        {record.inProgress && (
          <p className="dpr-help" role="status">
            {record.trace?.steps.at(-1) || '正在处理…'}
          </p>
        )}
        <div className="dpr-chat-answer">
          {record.answer ? (
            <MarkdownMessage text={record.answer} />
          ) : (
            record.error || (record.inProgress ? '正在生成回复…' : '没有生成回复内容。')
          )}
        </div>
        {record.sentText && (
          <div className="dpr-chat-answer">
            <p className="dpr-help">
              {record.status === 'delivered' ? '已发送正文' : '提交发送的正文（结果未确认）'}
            </p>
            <MarkdownMessage text={record.sentText} />
            {props.showCopy && <CopyButton text={record.sentText} label="复制发送正文" />}
          </div>
        )}
        {props.showTrace && <RecordTrace trace={record.trace} active={record.inProgress} />}
      </div>
    </article>
  );
}
