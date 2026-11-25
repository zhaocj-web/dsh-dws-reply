type ComposerKeyboardParams = {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  isComposing: boolean;
  keyCode: number;
  repeat: boolean;
};

/** 输入法确认候选词、长按回车及换行都不提交；229 兼容 WebView 输入法事件。 */
export function shouldSubmitConversation(params: ComposerKeyboardParams): boolean {
  return (
    params.key === 'Enter' &&
    !params.shiftKey &&
    !params.altKey &&
    !params.isComposing &&
    params.keyCode !== 229 &&
    !params.repeat
  );
}
