import { createHash } from 'node:crypto';
import { runDws } from './command';
import type { KnowledgeRequest, KnowledgeResult } from '../../shared/knowledge';

type KnowledgeParams = { profile: string; payload: unknown; run?: typeof runDws };
type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('知识库接口返回格式无效');
  return value as JsonObject;
}
function field(value: unknown, required = false): string {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || !value.trim() || value.length > 1024)
    throw new Error('知识库请求参数无效');
  return value;
}

/** 仅提供只读操作；使用当前关联账号，不接受客户端覆盖 profile。 */
export async function queryKnowledge(params: KnowledgeParams): Promise<KnowledgeResult> {
  if (!params.profile) throw new Error('请先关联钉钉账号');
  const payload = object(params.payload);
  const action = payload.action as KnowledgeRequest['action'];
  const run = params.run ?? runDws;
  const common = ['--profile', params.profile, '--format', 'json'];
  if (action === 'fetch') {
    const node = field(payload.node, true);
    if (!/^[a-zA-Z0-9_-]{1,256}$/.test(node)) throw new Error('请选择有效的钉钉文档节点');
    const result = object(
      await run([
        'doc',
        '+fetch',
        '--node',
        node,
        '--scope',
        'full',
        '--detail',
        'simple',
        ...common,
      ]),
    );
    const content = object(result.content);
    if (
      result.complete !== true ||
      result.status !== 'success' ||
      content.success !== true ||
      content.nodeId !== node
    )
      throw new Error('文档读取不完整或身份不匹配，保留原副本');
    if (typeof content.markdown !== 'string' || !content.markdown.trim())
      throw new Error('该文档没有可读取的文字正文');
    if (content.markdown.length > 100000) throw new Error('文档超过 10 万字符，请拆分后导入');
    return {
      document: {
        id:
          'wiki-' +
          createHash('sha256').update(`${params.profile}:${node}`).digest('hex').slice(0, 32),
        title: field(content.title, true).slice(0, 200),
        content: content.markdown,
        enabled: true,
        source: 'dingtalk',
        profile: params.profile,
        nodeId: node,
        updatedAt: new Date().toISOString(),
      },
    };
  }
  if (action !== 'spaces' && action !== 'nodes') throw new Error('未知知识库操作');
  const args = ['wiki', action === 'spaces' ? '+space-list' : '+node-list', '--limit', '50'];
  if (action === 'spaces') {
    if (!['orgWikiSpace', 'myWikiSpace'].includes(String(payload.spaceType)))
      throw new Error('请选择组织或个人知识库');
    args.push('--type', String(payload.spaceType));
  } else {
    args.push('--workspace', field(payload.workspace, true));
    const folder = field(payload.folder);
    if (folder) args.push('--folder', folder);
  }
  const cursor = field(payload.cursor);
  if (cursor) args.push('--cursor', cursor);
  const envelope = object(await run([...args, ...common]));
  const data = object(envelope.data);
  if (envelope.ok !== true || envelope.outcome !== 'success') throw new Error('知识库读取失败');
  if (action === 'spaces' && data.requestedType !== payload.spaceType)
    throw new Error('知识库范围不匹配');
  const rows = data[action === 'spaces' ? 'spaces' : 'nodes'];
  if (!Array.isArray(rows) || typeof data.hasMore !== 'boolean')
    throw new Error('知识库列表或分页信息不完整');
  const next = typeof data.nextCursor === 'string' ? data.nextCursor : '';
  if (data.hasMore && !next) throw new Error('知识库分页游标缺失，请刷新后重试');
  const items = rows.map((row) => {
    const item = object(row);
    if (
      action === 'nodes' &&
      item.workspaceId !== undefined &&
      item.workspaceId !== payload.workspace
    )
      throw new Error('文档不属于所选知识库');
    return {
      id: field(item[action === 'spaces' ? 'workspaceId' : 'nodeId'], true),
      name: field(item.name, true),
      folder: action === 'spaces' || item.type === 'folder',
      readable: item.extension === 'adoc',
      hasChildren: item.hasChildren === true,
    };
  });
  return { items, hasMore: data.hasMore, cursor: next };
}
