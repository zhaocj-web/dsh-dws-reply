import { KnowledgePreview } from './KnowledgePreview';
import React, { useEffect, useState } from 'react';
import type {
  KnowledgeDocument,
  KnowledgeRequest,
  KnowledgeResult,
} from '../../../shared/knowledge';
import { errorMessage } from '../../../shared/errors';
import { FormItem, Select } from '../Form';
import { ActionButton } from '../Controls';
import { KnowledgeFileIcon } from './KnowledgeFileList';

type WikiBrowserProps = {
  queryKnowledge: (params: KnowledgeRequest) => Promise<KnowledgeResult>;
  onDocument: (document: KnowledgeDocument) => void;
  sidebarHeader?: React.ReactNode;
};
type PreviewTarget = { node: string; title: string };
type Location = { workspace: string; folder?: string; name: string };

/** 左侧保留知识库列表，右侧独立浏览目录；两类列表分别保留分页游标。 */
export function WikiBrowser(props: WikiBrowserProps) {
  const [spaceType, setSpaceType] = useState<'orgWikiSpace' | 'myWikiSpace'>('orgWikiSpace');
  const [spaces, setSpaces] = useState<KnowledgeResult | null>(null);
  const [path, setPath] = useState<Location[]>([]);
  const [result, setResult] = useState<KnowledgeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<PreviewTarget>();
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError('');
    setMessage('');
    setSpaces(null);
    setPath([]);
    setResult(null);
    props
      .queryKnowledge({ action: 'spaces', spaceType })
      .then((data) => {
        if (active) setSpaces(data);
      })
      .catch((failure) => {
        if (active) setError(errorMessage(failure));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [spaceType, reload, props.queryKnowledge]);
  async function loadSpaces() {
    setBusy(true);
    setError('');
    try {
      const data = await props.queryKnowledge({
        action: 'spaces',
        spaceType,
        cursor: spaces?.cursor,
      });
      setSpaces({ ...data, items: [...(spaces?.items ?? []), ...(data.items ?? [])] });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function load(nextPath: Location[], append = false) {
    const location = nextPath.at(-1);
    if (!location) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await props.queryKnowledge({
        action: 'nodes',
        workspace: location.workspace,
        folder: location.folder,
        cursor: append ? result?.cursor : undefined,
      });
      setPath(nextPath);
      setResult(
        append ? { ...data, items: [...(result?.items ?? []), ...(data.items ?? [])] } : data,
      );
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function importDocument(node: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await props.queryKnowledge({ action: 'fetch', node });
      if (!data.document) throw new Error('未返回文档');
      props.onDocument(data.document);
      setMessage('已加入草稿，保存修改后参与回复。');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="dpr-stack">
      <div className="dpr-knowledge-layout">
        <nav className="dpr-scope-nav dpr-knowledge-nav" aria-label="钉钉知识库">
          {props.sidebarHeader}
          <span className="dpr-knowledge-section-label">知识库目录</span>
          <div className="dpr-wiki-scope">
            <FormItem label="知识库范围" hideLabel>
              <Select
                value={spaceType}
                disabled={busy}
                onChange={(event) => setSpaceType(event.target.value as typeof spaceType)}
              >
                <option value="orgWikiSpace">组织知识库</option>
                <option value="myWikiSpace">个人知识库</option>
              </Select>
            </FormItem>
          </div>

          {spaces?.items?.map((space) => (
            <button
              type="button"
              key={space.id}
              disabled={busy}
              aria-current={path[0]?.workspace === space.id ? 'page' : undefined}
              onClick={() => void load([{ workspace: space.id, name: space.name }])}
            >
              <KnowledgeFileIcon folder />
              <span>{space.name}</span>
            </button>
          ))}
          {spaces && !spaces.items?.length && <p className="dpr-help">当前范围暂无知识库。</p>}
          {spaces?.hasMore && (
            <ActionButton
              label="加载更多知识库"
              disabled={busy}
              onClick={() => void loadSpaces()}
            />
          )}
        </nav>
        <div className="dpr-knowledge-content" aria-busy={busy}>
          <div className="dpr-knowledge-content-header">
            <span className="dpr-help">浏览钉钉资料，点击文档预览后加入</span>
            <ActionButton
              label="刷新知识库"
              disabled={busy}
              onClick={() => setReload(reload + 1)}
            />
          </div>
          {error && (
            <p role="alert" className="dpr-error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="dpr-help">
              {message}
            </p>
          )}

          {!path.length ? (
            <p className="dpr-help">
              {busy ? '正在加载知识库…' : '选择左侧知识库，查看文件夹和文档。'}
            </p>
          ) : (
            <>
              <nav className="dpr-files-path" aria-label="钉钉知识库路径">
                {path.map((location, index) => (
                  <React.Fragment key={location.folder ?? location.workspace}>
                    {index > 0 && <span>/</span>}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void load(path.slice(0, index + 1))}
                    >
                      {location.name}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
              <div className="dpr-knowledge-actions">
                {path.length > 1 && (
                  <ActionButton
                    label="返回上级"
                    disabled={busy}
                    onClick={() => void load(path.slice(0, -1))}
                  />
                )}
                <ActionButton label="刷新目录" disabled={busy} onClick={() => void load(path)} />
              </div>
              <table className="dpr-files-table">
                <thead>
                  <tr>
                    <th scope="col">名称</th>
                    <th scope="col">类型</th>
                    <th scope="col">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {result?.items?.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <button
                          type="button"
                          className="dpr-file-name"
                          disabled={busy || !(item.folder || item.hasChildren || item.readable)}
                          onClick={() =>
                            item.readable
                              ? setPreview({ node: item.id, title: item.name })
                              : void load([
                                  ...path,
                                  {
                                    workspace: path[0].workspace,
                                    folder: item.id,
                                    name: item.name,
                                  },
                                ])
                          }
                        >
                          <KnowledgeFileIcon folder={item.folder} />
                          <span title={item.name}>{item.name}</span>
                        </button>
                      </td>
                      <td>{item.folder ? '文件夹' : item.readable ? '文档' : '其他'}</td>
                      <td>
                        {item.readable && item.hasChildren && (
                          <ActionButton
                            label="子目录"
                            disabled={busy}
                            onClick={() =>
                              void load([
                                ...path,
                                { workspace: path[0].workspace, folder: item.id, name: item.name },
                              ])
                            }
                          />
                        )}
                        {item.readable && (
                          <ActionButton
                            label="加入"
                            disabled={busy}
                            onClick={() => void importDocument(item.id)}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result && !result.items?.length && <p className="dpr-help">当前目录为空。</p>}
              {result?.hasMore && (
                <ActionButton
                  label="加载更多文件"
                  disabled={busy}
                  onClick={() => void load(path, true)}
                />
              )}
            </>
          )}
        </div>
      </div>
      {preview && (
        <KnowledgePreview
          key={preview.node}
          title={preview.title}
          node={preview.node}
          queryKnowledge={props.queryKnowledge}
          onAdd={props.onDocument}
          onClose={() => setPreview(undefined)}
        />
      )}
    </div>
  );
}
