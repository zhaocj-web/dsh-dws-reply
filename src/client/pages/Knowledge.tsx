import { KnowledgeNavigation } from '../components/knowledge/KnowledgeNavigation';
import { KnowledgeDialog } from '../components/knowledge/KnowledgeDialog';
import { KnowledgeFileList, KnowledgeFileIcon } from '../components/knowledge/KnowledgeFileList';
import React, { useRef, useState } from 'react';
import type { ReplyConfig } from '../../shared/types';
import { validateKnowledge } from '../../shared/knowledge';
import type { KnowledgeDocument, KnowledgeRequest, KnowledgeResult } from '../../shared/knowledge';
import { errorMessage } from '../../shared/errors';
import { FormItem, Input, SwitchFormItem } from '../components/Form';
import { ActionButton } from '../components/Controls';
import { KnowledgeEditor } from '../components/knowledge/KnowledgeEditor';
import { WikiBrowser } from '../components/knowledge/WikiBrowser';

type KnowledgeProps = {
  draftConfig: ReplyConfig;
  updateConfig: <K extends keyof ReplyConfig>(key: K, value: ReplyConfig[K]) => void;
  queryKnowledge: (params: KnowledgeRequest) => Promise<KnowledgeResult>;
};

/** 与其他页面共用配置草稿，增删与同步结果都在“保存修改”后生效。 */
export function Knowledge(props: KnowledgeProps) {
  const [view, setView] = useState<'documents' | 'wiki'>('documents');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeDocument>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [folder, setFolder] = useState<string | undefined>();
  const [folderName, setFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const knowledge = props.draftConfig.knowledge;
  const latest = useRef(knowledge);
  latest.current = knowledge;
  function createFolder() {
    try {
      const name = folderName.trim();
      props.updateConfig(
        'knowledge',
        validateKnowledge({ ...knowledge, folders: [...(knowledge.folders ?? []), name] }),
      );
      setFolderName('');
      setCreatingFolder(false);
      setError('');
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  function updateDocuments(documents: KnowledgeDocument[]) {
    props.updateConfig('knowledge', validateKnowledge({ ...latest.current, documents }));
  }
  function upsert(document: KnowledgeDocument) {
    const index = latest.current.documents.findIndex((item) => item.id === document.id);
    const documents = [...latest.current.documents];
    if (index >= 0)
      documents[index] = {
        ...document,
        enabled: documents[index].enabled,
        folder: documents[index].folder,
      };
    else documents.push({ ...document, folder });
    updateDocuments(documents);
  }
  async function sync(document: KnowledgeDocument) {
    setBusy(true);
    setError('');
    try {
      if (document.profile !== props.draftConfig.profile)
        throw new Error('请切换到导入此文档时的钉钉账号');
      const result = await props.queryKnowledge({ action: 'fetch', node: document.nodeId });
      if (!result.document || result.document.id !== document.id)
        throw new Error('文档身份发生变化，保留原副本');
      upsert(result.document);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  function openFolder(nextFolder?: string) {
    setFolder(nextFolder);
    setView('documents');
    setError('');
  }
  const navigation = (
    <KnowledgeNavigation
      source={view}
      count={knowledge.documents.length}
      onChange={(source) => {
        setView(source);
        setError('');
      }}
    />
  );
  return (
    <div className="dpr-knowledge-workspace">
      <div className="dpr-knowledge-topline">
        <span className="dpr-help">
          {knowledge.documents.length} 篇资料 ·{' '}
          {
            knowledge.documents.filter(
              (document) =>
                document.enabled &&
                (document.source === 'local' || document.profile === props.draftConfig.profile),
            ).length
          }{' '}
          篇已启用
        </span>
        <SwitchFormItem
          label="知识库检索"
          checked={knowledge.enabled}
          disabled={busy}
          tooltip="启用资料用于当前回复范围内的会话，钉钉资料使用手动同步的本地副本。"
          onChange={(enabled) => props.updateConfig('knowledge', { ...knowledge, enabled })}
        />
      </div>
      {view === 'wiki' ? (
        <WikiBrowser
          queryKnowledge={props.queryKnowledge}
          onDocument={upsert}
          sidebarHeader={navigation}
        />
      ) : (
        <div className="dpr-knowledge-layout">
          <nav className="dpr-scope-nav dpr-knowledge-nav" aria-label="知识库来源与目录">
            {navigation}
            <span className="dpr-knowledge-section-label">文件夹</span>
            <button
              type="button"
              aria-current={!folder ? 'page' : undefined}
              onClick={() => openFolder()}
            >
              <KnowledgeFileIcon folder />
              <span>根目录</span>
            </button>
            {(knowledge.folders ?? []).map((name) => (
              <button
                type="button"
                key={name}
                aria-current={folder === name ? 'page' : undefined}
                onClick={() => openFolder(name)}
              >
                <KnowledgeFileIcon folder />
                <span>{name}</span>
              </button>
            ))}
          </nav>
          <div className="dpr-knowledge-content">
            <div className="dpr-knowledge-content-header">
              <nav className="dpr-files-path" aria-label="当前路径">
                <button type="button" onClick={() => openFolder()}>
                  已加入资料
                </button>
                {folder && (
                  <>
                    <span>/</span>
                    <span>{folder}</span>
                  </>
                )}
              </nav>
              <div className="dpr-knowledge-actions">
                <ActionButton
                  label="新建文件夹"
                  disabled={busy}
                  onClick={() => {
                    setFolderName('');
                    setError('');
                    setCreatingFolder(true);
                  }}
                />
                <ActionButton
                  label="添加资料"
                  primary
                  disabled={busy}
                  onClick={() => {
                    setEditing(undefined);
                    setEditorOpen(true);
                  }}
                />
              </div>
            </div>
            {error && !creatingFolder && (
              <p role="alert" className="dpr-error">
                {error}
              </p>
            )}
            <KnowledgeFileList
              key={folder ?? 'root'}
              documents={knowledge.documents}
              folders={knowledge.folders ?? []}
              folder={folder}
              profile={props.draftConfig.profile}
              busy={busy}
              onFolder={openFolder}
              onEdit={(document) => {
                setEditing(document);
                setEditorOpen(true);
              }}
              onSync={(document) => void sync(document)}
              onUpdate={updateDocuments}
            />
          </div>
        </div>
      )}
      {editorOpen && (
        <KnowledgeDialog
          title={editing ? '编辑资料' : '添加资料'}
          onClose={() => setEditorOpen(false)}
        >
          <KnowledgeEditor
            key={editing?.id ?? 'new'}
            document={editing}
            onSave={upsert}
            onClose={() => setEditorOpen(false)}
          />
        </KnowledgeDialog>
      )}
      {creatingFolder && (
        <KnowledgeDialog compact title="新建文件夹" onClose={() => setCreatingFolder(false)}>
          <form
            className="dpr-stack"
            onSubmit={(event) => {
              event.preventDefault();
              createFolder();
            }}
          >
            <FormItem label="文件夹名称" error={error}>
              <Input
                autoFocus
                placeholder="输入文件夹名称"
                value={folderName}
                maxLength={80}
                onChange={(event) => setFolderName(event.target.value)}
              />
            </FormItem>
            <div className="dpr-knowledge-dialog-actions">
              <ActionButton label="取消" onClick={() => setCreatingFolder(false)} />
              <ActionButton
                label="创建"
                primary
                disabled={busy || !folderName.trim()}
                onClick={createFolder}
              />
            </div>
          </form>
        </KnowledgeDialog>
      )}
    </div>
  );
}
