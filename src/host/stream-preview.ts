/** 内部回复只预览 answer 字段，不把规则和待发送正文的 JSON 暴露为回复内容。 */
export function internalAnswerPreview(text: string): string {
  const match = /^\s*(?:```json\s*)?\{\s*"answer"\s*:\s*"/.exec(text);
  if (!match) return '';
  const value = text.slice(match[0].length);
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '"' && !escaped) {
      try {
        return JSON.parse('"' + value.slice(0, index) + '"');
      } catch {
        return '';
      }
    }
    if (char === '\\' && !escaped) escaped = true;
    else escaped = false;
  }
  try {
    return JSON.parse('"' + (escaped ? value.slice(0, -1) : value) + '"');
  } catch {
    return '';
  }
}
