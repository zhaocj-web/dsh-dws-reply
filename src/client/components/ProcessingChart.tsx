import React from 'react';
import type { ProcessingRecord, ReplyStatus } from '../../shared/types';
import { labels } from '../view-metadata';

type ProcessingChartProps = {
  records: ProcessingRecord[];
};

const statuses: ReplyStatus[] = ['delivered', 'draft', 'skipped', 'error', 'unknown', 'cancelled'];

/** 条形长度按记录总量计算，零记录时保留空轨道，避免误导性的占比。 */
export function ProcessingChart(props: ProcessingChartProps) {
  const total = props.records.length;
  return (
    <div className="dpr-processing-chart">
      <div className="dpr-processing-total">
        <span>处理总数</span>
        <strong>{total}</strong>
        <span>最近记录 · 条</span>
      </div>
      <div className="dpr-processing-bars" aria-label="处理状态分布">
        {statuses.map((status) => {
          const count = props.records.filter((record) => record.status === status).length;
          const percentage = total ? (count / total) * 100 : 0;
          return (
            <div className="dpr-processing-bar-row" key={status}>
              <span>{labels[status]}</span>
              <div className="dpr-processing-track" aria-hidden="true">
                <div style={{ width: `${percentage}%` }} />
              </div>
              <strong>{count}</strong>
            </div>
          );
        })}
        {total === 0 && <p className="dpr-help">暂无处理记录</p>}
      </div>
    </div>
  );
}
