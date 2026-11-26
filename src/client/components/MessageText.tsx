import React from 'react';
import { messageEmojiParts } from '../domain/message-emojis';

type MessageTextProps = { text: string };

/** 保留表情名称供读屏和悬停查看，复制仍使用原始消息。 */
export function MessageText(props: MessageTextProps) {
  return (
    <>
      {messageEmojiParts(props.text).map((part, index) =>
        part.label ? (
          <span
            key={index}
            className="dpr-message-emoji"
            role="img"
            aria-label={part.label}
            title={part.label}
          >
            {part.text}
          </span>
        ) : (
          <React.Fragment key={index}>{part.text}</React.Fragment>
        ),
      )}
    </>
  );
}
