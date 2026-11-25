import { KnowledgePreview } from './KnowledgePreview';
import React, { useState } from 'react';
import type { KnowledgeDocument } from '../../../shared/knowledge';
import { FormItem, Input, Select, SwitchFormItem } from '../Form';
import { ActionButton } from '../Controls';

type KnowledgeFileListProps = {
  documents: KnowledgeDocument[];
  folders: string[];
  folder?: string;
  profile: string;
  busy: boolean;
  onFolder: (folder: string) => void;
  onEdit: (document: KnowledgeDocument) => void;
  onSync: (document: KnowledgeDocument) => void;
  onUpdate: (documents: KnowledgeDocument[]) => void;
};
type FileIconProps = { folder?: boolean };

export function KnowledgeFileIcon(props: FileIconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {props.folder ? (
        <path d="M3 7V5h6l2 2h10v13H3V7Z" />
      ) : (
        <>
          <path d="M5 3h9l5 5v13H5V3Z" />
          <path d="M14 3v6h5M8 13h8M8 17h6" />
        </>
      )}
    </svg>
  );
}

/** 文件夹和文件共用列表；选中文件后显示操作，避免每行堆满表单控件。 */
export function KnowledgeFileList(props: KnowledgeFileListProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string>();
  const [preview, setPreview] = useState<KnowledgeDocument>();
  const documents = props.documents.filter(
    (document) =>
      document.folder === props.folder &&
      document.title.toLowerCase().includes(query.toLowerCase()),
  );
  const folders = props.folder
    ? []
    : props.folders.filter((folder) => folder.toLowerCase().includes(query.toLowerCase()));
  const current = documents.find((document) => document.id === selected);
  function update(document: KnowledgeDocument) {
    props.onUpdate(props.documents.map((item) => (item.id === document.id ? document : item)));
  }
  return (
    <>
      <div className="dpr-files-search">
        <FormItem label="搜索当前文件夹" hideLabel>
          <Input
            type="search"
            value={query}
            placeholder="搜索当前文件夹"
            onChange={(event) => setQuery(event.target.value)}
          />
        </FormItem>
      </div>
      <div className="dpr-files-table-scroll">
        <table className="dpr-files-table">
          <thead>
            <tr>
              <th scope="col">名称</th>
              <th scope="col">来源</th>
              <th scope="col">状态</th>
            </tr>
          </thead>
          <tbody>
            {folders.map((folder) => (
              <tr key={`folder-${folder}`}>
                <td>
                  <button
                    type="button"
                    className="dpr-file-name"
                    onClick={() => props.onFolder(folder)}
                  >
                    <KnowledgeFileIcon folder />
                    <span>{folder}</span>
                  </button>
                </td>
                <td>文件夹</td>
                <td>
                  {props.documents.filter((document) => document.folder === folder).length} 项
                </td>
              </tr>
            ))}
            {documents.map((document) => (
              <tr key={document.id} data-selected={document.id === selected}>
                <td>
                  <button
                    type="button"
                    className="dpr-file-name"
                    aria-pressed={document.id === selected}
                    onClick={() => {
                      setSelected(document.id);
                      setPreview(document);
                    }}
                  >
                    <KnowledgeFileIcon />
                    <span>{document.title}</span>
                  </button>
                </td>
                <td>{document.source === 'local' ? '本地' : '钉钉'}</td>
                <td>
                  {document.source === 'dingtalk' && document.profile !== props.profile
                    ? '其他账号'
                    : document.enabled
                      ? '已启用'
                      : '未启用'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!folders.length && !documents.length && (
          <p className="dpr-files-empty">
            {query ? '没有匹配的文件。' : '文件夹为空，可在上方添加文档或导入钉钉资料。'}
          </p>
        )}
      </div>
      {current && (
        <section className="dpr-file-details" aria-label="所选文件详情">
          <SwitchFormItem
            label={current.title}
            checked={current.enabled}
            disabled={props.busy}
            onChange={(enabled) => update({ ...current, enabled })}
          />
          <p className="dpr-help">
            {current.content.length.toLocaleString()} 字符 · 更新于{' '}
            {new Date(current.updatedAt).toLocaleString()}
          </p>
          <div className="dpr-knowledge-actions">
            <FormItem label="移动到" hideLabel>
              <Select
                value={current.folder ?? ''}
                disabled={props.busy}
                onChange={(event) =>
                  update({ ...current, folder: event.target.value || undefined })
                }
              >
                <option value="">根目录</option>
                {props.folders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </Select>
            </FormItem>
            {current.source === 'local' ? (
              <ActionButton
                label="编辑"
                disabled={props.busy}
                onClick={() => props.onEdit(current)}
              />
            ) : (
              <ActionButton
                label="同步"
                disabled={props.busy || current.profile !== props.profile}
                onClick={() => props.onSync(current)}
              />
            )}
            <ActionButton
              label="移除"
              disabled={props.busy}
              onClick={() =>
                props.onUpdate(props.documents.filter((document) => document.id !== current.id))
              }
            />
          </div>
          <p className="dpr-file-preview">
            {current.content.slice(0, 600)}
            {current.content.length > 600 ? '…' : ''}
          </p>
        </section>
      )}
      <div className="dpr-files-status">
        {folders.length + documents.length} 项{current ? ' · 已选择 1 个文件' : ''}
      </div>
      {preview && (
        <KnowledgePreview
          key={preview.id}
          title={preview.title}
          document={preview}
          onClose={() => setPreview(undefined)}
        />
      )}
    </>
  );
}
