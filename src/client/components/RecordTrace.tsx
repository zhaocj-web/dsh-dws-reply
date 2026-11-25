import { CopyButton } from './CopyButton';
import React from 'react';
import { ToolCallList } from './ToolCallList';
import type { ProcessingTrace } from '../../shared/types';

type RecordTraceProps = { trace?: ProcessingTrace };

export function RecordTrace(props: RecordTraceProps) {
  const trace = props.trace;
  return (
    <details className="dpr-record-trace">
      <summary>思考过程{trace ? ` · ${(trace.durationMs / 1000).toFixed(1)} 秒` : ''}</summary>
      {trace ? (
        <div className="dpr-record-trace-body">
          <dl className="dpr-config-descriptions">
            {trace.model && (
              <div>
                <dt>实际模型</dt>
                <dd>
                  {trace.model.provider} / {trace.model.model}
                </dd>
              </div>
            )}
            <div>
              <dt>上下文</dt>
              <dd>{trace.historyTurns} 轮</dd>
            </div>
            {trace.imageCount !== undefined && (
              <div>
                <dt>图片</dt>
                <dd>{trace.imageCount} 张</dd>
              </div>
            )}
          </dl>
          {trace.ruleChange && (
            <details>
              <summary>已更新会话回复规则</summary>
              <p className="dpr-knowledge-excerpt">
                {trace.ruleChange.after || '已清空专属文字规则，继承公共规则。'}
              </p>
            </details>
          )}
          <ToolCallList calls={trace.toolCalls} />
          {trace.knowledgeReferences !== undefined && (
            <details>
              <summary>知识库参考 · {trace.knowledgeReferences.length}</summary>
              <p className="dpr-help">以下片段已提供给模型参考，不代表最终回复一定采用。</p>
              <ul className="dpr-tool-call-list">
                {trace.knowledgeReferences.map((reference, index) => (
                  <li key={`${reference.id}-${index}`}>
                    <strong>{reference.title}</strong>
                    <p>
                      {reference.source === 'local' ? '本地资料' : '钉钉副本'} ·{' '}
                      {new Date(reference.updatedAt).toLocaleString()}
                    </p>
                    <p className="dpr-knowledge-excerpt">{reference.excerpt}</p>
                  </li>
                ))}
              </ul>
              {!trace.knowledgeReferences.length && (
                <p className="dpr-help">本次未提供知识库片段。</p>
              )}
            </details>
          )}
          <div className="dpr-model-reasoning">
            {trace.reasoning && <CopyButton text={trace.reasoning} label="复制推理内容" />}
            <p>{trace.reasoning || '本次模型未返回推理内容。'}</p>
            {trace.reasoningTruncated && (
              <p className="dpr-help">内容较长，仅保留前 32000 字符。</p>
            )}
          </div>
        </div>
      ) : (
        <p className="dpr-help">这条历史记录未保存生成过程。</p>
      )}
    </details>
  );
}
