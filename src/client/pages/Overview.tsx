import React from 'react';
import type { PluginSnapshot } from '../../shared/types';
import { ProcessingChart } from '../components/ProcessingChart';
import { useNavigation } from '../components/Navigation';
import { labels } from '../view-metadata';
export function Overview(props: OverviewProps) {
  const navigation = useNavigation();
  const records = props.snapshot.state.records;
  const phase = props.snapshot.state.phase;
  const statusDescriptions = {
    disabled: '监听未启动，当前不会处理新消息。',
    starting: '正在连接钉钉，等待消息监听就绪。',
    draft: '正在监听新消息，仅生成草稿，不自动发送。',
    running: '按已保存的会话范围与规则，自动发送回复。',
    error: '监听或处理出现异常，请查看页面中的错误提示。',
  };
  return (
    <div className="dpr-overview">
      <header className="dpr-overview-status">
        <h1>
          <span className="dpr-dot" data-phase={phase} aria-hidden={true} />
          {phase === 'error' ? '连接异常' : labels[phase]}
        </h1>
        <p className="dpr-sub">{statusDescriptions[phase]}</p>
      </header>
      <div className="dpr-overview-sections">
        <section
          className="dpr-overview-section dpr-overview-secondary"
          aria-labelledby="dpr-activity-heading"
        >
          <header className="dpr-overview-section-header">
            <h2 id="dpr-activity-heading">最近处理</h2>
            <button
              type="button"
              className="dpr-text-button"
              onClick={() => navigation.navigate('records')}
            >
              查看记录 →
            </button>
          </header>
          <ProcessingChart records={records} />
        </section>
      </div>
      <p className="dpr-help dpr-overview-note">
        统计包含本地保存的最近 30 条记录；关闭应用或电脑休眠后，代答停止工作。
      </p>
    </div>
  );
}

type OverviewProps = {
  snapshot: PluginSnapshot;
};
