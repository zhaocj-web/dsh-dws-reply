import { parseInternalReply, type InternalReply } from './internal-rule-update';

type ResolveInternalReplyParams = {
  text: string;
  signal: AbortSignal;
  retry: () => Promise<string>;
};

/** 格式重试只调用模型；完整校验成功之前不向外暴露任何动作。 */
export async function resolveInternalReply(
  params: ResolveInternalReplyParams,
): Promise<InternalReply> {
  params.signal.throwIfAborted();
  try {
    return parseInternalReply(params.text);
  } catch {}
  try {
    const repaired = await params.retry();
    params.signal.throwIfAborted();
    return parseInternalReply(repaired);
  } catch {
    params.signal.throwIfAborted();
    const plainText = params.text.trim();
    const explanation =
      plainText && !/[{}]|```/.test(plainText)
        ? `\n\n模型原始说明（不代表操作已执行）：\n${plainText.slice(0, 12000)}`
        : '';
    return {
      answer:
        '本轮模型未返回可执行的操作结果，未发送消息，也未修改规则。请重新说明你的要求。' +
        explanation,
      rules: null,
      send: null,
    };
  }
}
