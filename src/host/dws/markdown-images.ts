import { fromMarkdown } from 'mdast-util-from-markdown';
import type { Root, RootContent, Image } from 'mdast';
import { imageUrl } from './image-download';

type MarkdownImage = { node: Image; url: string };
/** 使用语法树定位图片；发送仅支持内联公网图片，引用式和 HTML 图片明确拒绝。 */
export function markdownImages(text: string): MarkdownImage[] {
  const result: MarkdownImage[] = [];
  const walk = (node: Root | RootContent) => {
    if (node.type === 'imageReference')
      throw new Error('请使用 ![说明](https://图片地址) 内联图片格式');
    if (node.type === 'html' && /<img\b/i.test(node.value))
      throw new Error('不支持 HTML 图片，请使用 Markdown 图片格式');
    if (node.type === 'image') {
      result.push({ node, url: imageUrl(node.url).href });
      if (result.length > 4) throw new Error('一条消息最多支持 4 张图片');
    }
    if ('children' in node) for (const child of node.children) walk(child);
  };
  walk(fromMarkdown(text));
  return result;
}
