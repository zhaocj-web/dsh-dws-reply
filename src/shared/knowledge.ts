export type KnowledgeDocument = {
  id: string;
  folder?: string;
  title: string;
  content: string;
  enabled: boolean;
  updatedAt: string;
  source: 'local' | 'dingtalk';
  profile?: string;
  nodeId?: string;
};
export type KnowledgeConfig = {
  enabled: boolean;
  folders?: string[];
  documents: KnowledgeDocument[];
};
export type KnowledgeReference = {
  id: string;
  title: string;
  source: 'local' | 'dingtalk';
  updatedAt: string;
  excerpt: string;
};
export type KnowledgeRequest = {
  action: 'spaces' | 'nodes' | 'fetch';
  spaceType?: 'orgWikiSpace' | 'myWikiSpace';
  workspace?: string;
  folder?: string;
  cursor?: string;
  node?: string;
};
export type KnowledgeItem = {
  id: string;
  name: string;
  folder: boolean;
  readable: boolean;
  hasChildren: boolean;
};
export type KnowledgeResult = {
  items?: KnowledgeItem[];
  hasMore?: boolean;
  cursor?: string;
  document?: KnowledgeDocument;
};

/** 限制总量和字段，避免大文档撑满配置、模型上下文或跨账号复用云端资料。 */
export function validateKnowledge(input: KnowledgeConfig): KnowledgeConfig {
  if (
    !input ||
    typeof input.enabled !== 'boolean' ||
    !Array.isArray(input.documents) ||
    input.documents.length > 50
  )
    throw new Error('知识库配置无效，最多保存 50 篇文档');
  const folders = input.folders ?? [];
  if (
    !Array.isArray(folders) ||
    folders.length > 50 ||
    folders.some((folder) => typeof folder !== 'string' || !folder.trim() || folder.length > 80) ||
    new Set(folders).size !== folders.length
  )
    throw new Error('文件夹名称不能为空或重复，最多 50 个，每个最多 80 字');
  const ids = new Set<string>();
  let total = 0;
  const documents = input.documents.map((doc) => {
    if (
      !doc ||
      typeof doc.id !== 'string' ||
      !doc.id ||
      doc.id.length > 512 ||
      ids.has(doc.id) ||
      typeof doc.title !== 'string' ||
      !doc.title.trim() ||
      doc.title.length > 200 ||
      typeof doc.content !== 'string' ||
      !doc.content.trim() ||
      doc.content.length > 100000 ||
      typeof doc.enabled !== 'boolean' ||
      !['local', 'dingtalk'].includes(doc.source) ||
      typeof doc.updatedAt !== 'string' ||
      !Number.isFinite(Date.parse(doc.updatedAt))
    )
      throw new Error('知识文档无效：标题最多 200 字，正文最多 10 万字符，标识不可重复');
    if (
      doc.source === 'dingtalk' &&
      (!doc.profile ||
        typeof doc.profile !== 'string' ||
        doc.profile.length > 512 ||
        !doc.nodeId ||
        typeof doc.nodeId !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,256}$/.test(doc.nodeId))
    )
      throw new Error('钉钉知识文档缺少有效账号或节点标识');
    if (doc.folder !== undefined && !folders.includes(doc.folder))
      throw new Error('知识文档所属文件夹不存在');
    ids.add(doc.id);
    total += doc.content.length;
    return {
      id: doc.id,
      ...(doc.folder ? { folder: doc.folder } : {}),
      title: doc.title.trim(),
      content: doc.content,
      enabled: doc.enabled,
      updatedAt: doc.updatedAt,
      source: doc.source,
      ...(doc.source === 'dingtalk' ? { profile: doc.profile, nodeId: doc.nodeId } : {}),
    };
  });
  if (total > 500000) throw new Error('知识库正文总量不能超过 50 万字符');
  return { enabled: input.enabled, documents, ...(folders.length ? { folders } : {}) };
}
