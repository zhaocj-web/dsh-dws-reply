import { createHash } from 'node:crypto';
import type { MessageEvent, ReplyConfig, ReplyTarget } from '../../shared/types';
export interface DeliveryReceipt {
  deliveryStatus?: string;
  delivery_status?: string;
  data?: {
    deliveryStatus?: string;
    delivery_status?: string;
  };
}
/** 按来源、身份、时效和名单筛选；不使用消息正文决定发送目标。 */
export function eligible(
  event: MessageEvent,
  config: ReplyConfig,
  now = Date.now(),
): ReplyTarget | null {
  if (!config.enabled) return null;
  const kind =
    event.type === 'user_im_message_receive_o2o_all'
      ? 'direct'
      : event.type === 'user_im_message_receive_at'
        ? 'group'
        : null;
  if (!kind || !event.message_id || !event.conversation_id || !event.sender_open_dingtalk_id)
    return null;
  if (
    event.sender_open_dingtalk_id === config.selfId ||
    typeof event.content !== 'string' ||
    !event.content.trim() ||
    event.content.length > 12000
  )
    return null;
  const messageTime =
    Number(event.event_time || event.timestamp) || Date.parse(event.create_time ?? '');
  if (
    !Number.isFinite(messageTime) ||
    now - messageTime > config.maxAgeSeconds * 1000 ||
    messageTime - now > 30000
  )
    return null;
  const policy = config[`${kind}Policy`];
  const target = kind === 'direct' ? event.sender_open_dingtalk_id : event.conversation_id;
  if (policy === 'off' || (policy === 'allowlist' && !config[`${kind}Ids`].includes(target)))
    return null;
  return {
    kind,
    target,
    conversation: event.conversation_id,
    key: createHash('sha256')
      .update(JSON.stringify([config.profile, event.conversation_id, event.message_id]))
      .digest('hex'),
  };
}
export function sendArgs(config: ReplyConfig, target: ReplyTarget): string[] {
  return [
    'chat',
    '+messages-send',
    '--profile',
    config.profile,
    '--as',
    'user',
    target.kind === 'direct' ? '--open-dingtalk-id' : '--group',
    target.target,
    '--text',
    '-',
    '--body-stdin',
    '--idempotency-key',
    target.key,
    '--wait-delivery',
    '--yes',
    '--format',
    'json',
  ];
}
export function deliveryStatus(result: DeliveryReceipt): 'delivered' | 'unknown' {
  // 只有明确送达回执才算成功；未知投递状态不能重发。
  const status =
    result?.deliveryStatus ??
    result?.delivery_status ??
    result?.data?.deliveryStatus ??
    result?.data?.delivery_status;
  return status === 'delivered' ? 'delivered' : 'unknown';
}
