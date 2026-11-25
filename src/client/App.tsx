import { Knowledge } from './pages/Knowledge';
import { RuntimeButton } from './components/RuntimeButton';
import { Styles } from './pages/Styles';
import React, { useState } from 'react';
import { SettingsDialog } from './components/settings/SettingsDialog';
import type { RpcClient } from '../shared/types';
import { ActionButton } from './components/Controls';
import { NavigationProvider } from './components/Navigation';
import { useReplyWorkspace } from './hooks/useReplyWorkspace';
import { Overview } from './pages/Overview';
import { Records } from './pages/Records';
import { Scope } from './pages/Scope';
import CSS from './styles.css';
import { labels, tabs } from './view-metadata';
/** 工作台只负责布局与路由，具体页面复用同一个草稿状态。 */
export function App(props: AppProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    setRuntimeEnabled,
    listContacts,
    listGroups,
    searchContacts,
    searchGroups,
    listModels,
    queryKnowledge,
    snapshot,
    draftConfig,
    page,
    filter,
    isBusy,
    error,
    notice,
    updateConfig,
    performAction,
    chatWithModel,
    setPage,
    setFilter,
  } = useReplyWorkspace(props.rpc);
  if (!draftConfig || !snapshot)
    return (
      <div className="dpr">
        <style>{CSS}</style>
        <div className="dpr-loading" aria-busy={!error}>
          {error ? <p role="alert">{error}</p> : '正在加载个人代答…'}
        </div>
      </div>
    );
  const normalizedConfig = {
    ...draftConfig,
    directIds: draftConfig.directIds.map((x) => x.trim()).filter(Boolean),
    groupIds: draftConfig.groupIds.map((x) => x.trim()).filter(Boolean),
  };
  const hasUnsavedChanges = JSON.stringify(normalizedConfig) !== JSON.stringify(snapshot.config);
  const shared = {
    chatWithModel,
    setRuntimeEnabled,
    listContacts,
    listGroups,
    searchContacts,
    searchGroups,
    listModels,
    queryKnowledge,
    snapshot,
    draftConfig,
    updateConfig,
    isBusy,
    performAction,
    filter,
    setFilter,
  };
  const views = {
    overview: Overview,
    scope: Scope,
    styles: Styles,
    records: Records,
    knowledge: Knowledge,
  };
  const CurrentPage = views[page];
  return (
    <div className="dpr">
      <style>{CSS}</style>
      <header className="dpr-bar">
        <nav className="dpr-nav" aria-label="钉钉个人代答导航">
          {tabs.map(([id, label]) => (
            <button
              type="button"
              key={id}
              aria-current={page === id ? 'page' : undefined}
              onClick={() => setPage(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="dpr-header-actions">
          <div className="dpr-status">
            <span className="dpr-dot" data-phase={snapshot.state.phase} aria-hidden={true} />
            {snapshot.state.phase === 'error'
              ? '连接异常'
              : labels[snapshot.state.phase] || snapshot.state.phase}
          </div>
          <RuntimeButton
            enabled={snapshot.config.enabled}
            isBusy={isBusy}
            onChange={setRuntimeEnabled}
          />
          <button
            type="button"
            className="dpr-settings-trigger"
            aria-label="设置"
            title="设置"
            onClick={() => setSettingsOpen(true)}
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 3-.6 2.3-2 .9-2.2-.6-2 3.4 1.6 1.8v2.4L2.2 15l2 3.4 2.2-.6 2 .9L9 21h4l.6-2.3 2-.9 2.2.6 2-3.4-1.6-1.8v-2.4L19.8 9l-2-3.4-2.2.6-2-.9L13 3z" />
              <circle cx="11" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </header>
      <main className="dpr-body" data-page={page}>
        <div className="dpr-page">
          {snapshot.state.error && (
            <p role="alert" className="dpr-callout dpr-error">
              {snapshot.state.error}
            </p>
          )}
          <NavigationProvider navigation={{ navigate: setPage }} route={{ name: page }}>
            <CurrentPage {...shared} />
          </NavigationProvider>
        </div>
      </main>
      {settingsOpen && (
        <NavigationProvider
          navigation={{
            navigate: (target) => {
              setSettingsOpen(false);
              setPage(target);
            },
          }}
          route={{ name: page }}
        >
          <SettingsDialog
            {...shared}
            normalizedConfig={normalizedConfig}
            hasUnsavedChanges={hasUnsavedChanges}
            error={error}
            notice={notice}
            onClose={() => setSettingsOpen(false)}
          />
        </NavigationProvider>
      )}
      <footer className="dpr-footer">
        <div className="dpr-footer-note" aria-live="polite">
          {error ? (
            <span role="alert" className="dpr-error">
              {error}
            </span>
          ) : (
            notice ||
            (hasUnsavedChanges ? '有未保存的修改，切换页面不会丢失。' : '所有设置已保存。')
          )}
        </div>
        <ActionButton
          label={isBusy ? '处理中…' : '保存修改'}
          onClick={() => performAction('save', normalizedConfig)}
          disabled={isBusy || !hasUnsavedChanges}
          primary={true}
        />
      </footer>
    </div>
  );
}
type AppProps = {
  rpc: RpcClient;
};
