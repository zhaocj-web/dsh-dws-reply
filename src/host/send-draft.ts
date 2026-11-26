import { createHash } from 'node:crypto';
import type { Ledger, ProcessingRecord, ReplyConfig, RpcRequests } from '../shared/types';
import { deliveryStatus, type DeliveryReceipt } from './dws/message-policy';
import { MessagePreparationError } from './dws/send-message';
import type { ReplyTarget } from '../shared/types';

type SendDraftParams = {
  request: unknown;
  config: ReplyConfig;
  records: ProcessingRecord[];
  ledger: Ledger;
  saveLedger: () => Promise<void>;
  verifyAccount: () => Promise<void>;
  saveRecord: (record: ProcessingRecord) => Promise<void>;
  send: (target: ReplyTarget, text: string) => Promise<DeliveryReceipt>;
};

/** 只从已保存记录读取正文和目标，客户端不能替换收件人、正文或发送状态。调用方必须串行执行。 */
export async function sendDraft(params: SendDraftParams): Promise<void> {
  const request = params.request as Partial<RpcRequests['sendDraft']> | null;
  if (
    !request ||
    !['direct', 'group'].includes(request.kind ?? '') ||
    typeof request.target !== 'string' ||
    typeof request.time !== 'string'
  )
    throw new Error('草稿请求无效');
  const matches = params.records.filter(
    (record) =>
      record.kind === request.kind &&
      record.target === request.target &&
      record.time === request.time,
  );
  if (matches.length !== 1) throw new Error('草稿不存在或无法唯一定位，请刷新记录');
  const record = matches[0];
  if (
    record.status !== 'draft' ||
    record.origin === 'owner' ||
    record.inProgress ||
    !record.answer?.trim()
  )
    throw new Error('只有已生成的来信回复草稿可以发送');
  if (!params.config.profile || !params.config.selfId) throw new Error('请先关联钉钉账号');
  if (record.answer.length > params.config.maxReplyChars)
    throw new Error('草稿超过当前回复字数限制');
  const key = createHash('sha256')
    .update(
      JSON.stringify([
        params.config.profile,
        'draft-send',
        record.kind,
        record.target,
        record.time,
      ]),
    )
    .digest('hex');
  if (params.ledger[key]) throw new Error('这条草稿已经提交发送，不会重复发送；请查看送达状态');
  await params.verifyAccount();
  params.ledger[key] = { time: Date.now(), status: 'sending' };
  await params.saveLedger();
  let status: 'delivered' | 'unknown';
  let error: string | undefined;
  try {
    status = deliveryStatus(
      await params.send(
        {
          kind: request.kind!,
          target: record.target,
          conversation: record.conversationId ?? record.target,
          key,
        },
        record.answer,
      ),
    );
    if (status === 'unknown') error = '已提交发送，未确认送达，不会自动重发';
  } catch (failure) {
    if (failure instanceof MessagePreparationError) {
      delete params.ledger[key];
      await params.saveLedger();
      throw failure;
    }
    status = 'unknown';
    error = '发送结果未知，不会重复发送，请先在钉钉确认';
  }
  params.ledger[key] = { time: Date.now(), status };
  await params.saveLedger();
  await params.saveRecord({ ...record, status, error });
}
