import React, { useId, useRef } from 'react';
import { IconButton } from './IconButton';
import type { PluginSnapshot } from '../../shared/types';
import type { RecordConversation } from '../domain/record-conversations';
import { isSmartReplyModel } from '../../shared/reply-model';
import { presetReplyStyles } from '../../shared/reply-styles';

type ConversationDetailsProps = {
  conversation: RecordConversation;
  snapshot: PluginSnapshot;
};

/** 配置信息取已保存值；历史记录与当前模型上下文分别说明。 */
export function ConversationDetails(props: ConversationDetailsProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const conversation = props.conversation;
  if (conversation.kind === 'test') return null;
  const config = props.snapshot.config;
  const contact =
    conversation.kind === 'direct'
      ? config.contactProfiles.find((item) => item.openDingTalkId === conversation.target)
      : undefined;
  const rule = config.conversationRules.find(
    (item) => item.kind === conversation.kind && item.targetId === conversation.target,
  );
  const model = rule?.replyModel ?? config.replyModel;
  const style = [...presetReplyStyles, ...config.replyStyles].find(
    (item) => item.id === (rule?.styleId ?? config.activeStyleId),
  );
  const policy = config[`${conversation.kind}Policy`];
  const included =
    policy === 'all' ||
    (policy === 'allowlist' && config[`${conversation.kind}Ids`].includes(conversation.target));
  const fields = [
    ['会话名称', conversation.label],
    ['会话类型', conversation.kind === 'direct' ? '私聊' : '群聊（仅 @我）'],
    ['姓名', contact?.realName],
    ['公司', contact?.company],
    ['部门', contact?.department],
    ['职位', contact?.position],
    ['回复范围', included ? '已纳入回复范围' : '不在回复范围内'],
    [
      '回复模型',
      isSmartReplyModel(model)
        ? '模型智能选择'
        : model
          ? `${model.provider} / ${model.model}`
          : '跟随 DSH 默认模型',
    ],
    ['回复风格', `${style?.name ?? '默认表达'}${rule?.styleId ? '（专属）' : '（全局）'}`],
    ['回复规则', rule?.rules ? '公共规则 + 专属规则' : '公共规则'],
    ['上下文上限', config.historyTurns ? `最近 ${config.historyTurns} 轮有效对话` : '不保留上下文'],
  ].filter((field) => field[1]);
  return (
    <>
      <button type="button" className="dpr-text-button" onClick={() => dialog.current?.showModal()}>
        会话信息
      </button>
      <dialog
        ref={dialog}
        className="dpr-rule-dialog dpr-conversation-dialog"
        aria-labelledby={titleId}
      >
        <header className="dpr-conversation-dialog-heading">
          <h2 id={titleId}>会话信息</h2>
          <IconButton label="关闭会话信息" onClick={() => dialog.current?.close()}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </IconButton>
        </header>
        <dl className="dpr-config-descriptions">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="dpr-help">
          上下文从本地记录恢复，包含已送达回复与内部交流；每次实际使用的轮数可在“思考与处理记录”中查看。
        </p>
      </dialog>
    </>
  );
}
