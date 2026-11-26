import React from 'react';
import Markdown, { type ExtraProps } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { messageEmojiParts } from '../domain/message-emojis';

type MarkdownMessageProps = { text: string };
type MarkdownNode = { type: string; value?: string; children?: MarkdownNode[] };
type MarkdownLinkProps = React.ComponentProps<'a'> & ExtraProps;
type MarkdownTableProps = React.ComponentProps<'table'> & ExtraProps;
type MarkdownImageProps = React.ComponentProps<'img'> & ExtraProps;

/** 仅转换正文文本节点，代码、链接地址和原始复制内容保持不变。 */
function remarkMessageEmojis() {
  return (tree: MarkdownNode) => {
    function visit(node: MarkdownNode): void {
      if (node.type === 'code' || node.type === 'inlineCode') return;
      if (node.type === 'text' && node.value)
        node.value = messageEmojiParts(node.value)
          .map((part) => part.text)
          .join('');
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}

function MarkdownLink(props: MarkdownLinkProps) {
  const href = props.href && /^(https?:\/\/|mailto:)/i.test(props.href) ? props.href : undefined;
  return href ? (
    <a href={href} title={props.title} target="_blank" rel="noopener noreferrer">
      {props.children}
    </a>
  ) : (
    <span>{props.children}</span>
  );
}

function MarkdownTable(props: MarkdownTableProps) {
  return (
    <div className="dpr-markdown-table" tabIndex={0} role="region" aria-label="回复中的表格">
      <table>{props.children}</table>
    </div>
  );
}

function MarkdownImage(props: MarkdownImageProps) {
  if (!props.src || !/^https?:\/\//i.test(props.src)) return <span>{props.alt ?? '图片'}</span>;
  return (
    <img
      src={props.src}
      alt={props.alt ?? '回复中的图片'}
      title={props.title}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

/** 不启用原始 HTML；模型输出始终作为 Markdown 文本解析。 */
export function MarkdownMessage(props: MarkdownMessageProps) {
  return (
    <div className="dpr-markdown">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMessageEmojis]}
        skipHtml
        components={{ a: MarkdownLink, table: MarkdownTable, img: MarkdownImage }}
      >
        {props.text}
      </Markdown>
    </div>
  );
}
