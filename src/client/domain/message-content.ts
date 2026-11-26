/** 仅隐藏 DWS 图片占位符和紧随其后的下载说明，保留用户的其他文字。 */
export function messageContent(input: string): { text: string; hasImages: boolean } {
  const marker = /\[图片消息\]\\?\(mediaId=[^\s)]+\)/g;
  const hasImages = marker.test(input);
  if (!hasImages) return { text: input, hasImages: false };
  const text = input
    .replace(
      /\[图片消息\]\\?\(mediaId=[^\s)]+\)(?:[ \t\r\n]*注意[：:][ \t]*如需下载使用[ \t]*dws chat message download-media[ \t]*命令下载[。.]?)?/g,
      '',
    )
    .trim();
  return { text, hasImages: true };
}
