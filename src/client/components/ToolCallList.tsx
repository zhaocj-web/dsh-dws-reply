import React from 'react';
import type { ToolCallRecord } from '../../shared/types';

type ToolCallListProps = { calls?: ToolCallRecord[] };

const statusLabels = {
  success: '完成',
  failed: '失败',
  cancelled: '已取消',
};

/** 展示插件实际执行的接口记录，不将其描述为模型自主调用的技能。 */
export function ToolCallList(props: ToolCallListProps) {
  return (
    <div className="dpr-tool-calls">
      <p className="dpr-help">工具调用{props.calls?.length ? ` · ${props.calls.length}` : ''}</p>
      {props.calls?.length ? (
        <ul className="dpr-tool-call-list">
          {props.calls.map((call, index) => (
            <li key={`${call.time}-${index}`}>
              <div className="dpr-tool-call-heading">
                <strong>{call.tool}</strong>
                <span>
                  {statusLabels[call.status]} · {(call.durationMs / 1000).toFixed(1)} 秒
                </span>
              </div>
              <p>{call.purpose}</p>
              <p>{call.result}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dpr-help">
          {props.calls ? '本次没有记录工具调用。' : '这条历史记录未保存工具调用明细。'}
        </p>
      )}
    </div>
  );
}
