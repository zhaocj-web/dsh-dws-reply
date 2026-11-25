import { RecordChat } from '../components/RecordChat';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { RecordConversations } from '../components/RecordConversations';
import { recordConversations, recordConversationKey } from '../domain/record-conversations';
import type { Endpoint, PluginSnapshot } from '../../shared/types';
import { ActionButton } from '../components/Controls';
import { FormItem, Select } from '../components/Form';
import { labels } from '../view-metadata';
export function Records(props: RecordsProps) {
  const [selected, setSelected] = useState('all');
  const messages = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const conversations = recordConversations({
    records: props.snapshot.state.records,
    config: props.snapshot.config,
  });
  // 旧会话被最近 30 条记录淘汰后，回到全部记录，避免留下无效选中项。
  const active = conversations.find((item) => item.key === selected);
  const selectedKey = active?.key || 'all';
  const records = props.snapshot.state.records.filter(
    (record) =>
      (selectedKey === 'all' || recordConversationKey(record) === selectedKey) &&
      (props.filter === 'all' || record.status === props.filter),
  );
  useLayoutEffect(() => {
    followLatest.current = true;
    if (messages.current) messages.current.scrollTop = messages.current.scrollHeight;
  }, [selectedKey]);
  useLayoutEffect(() => {
    if (followLatest.current && messages.current)
      messages.current.scrollTop = messages.current.scrollHeight;
  }, [props.snapshot.state.records[0]?.time, records.length]);
  const hasRecords = props.snapshot.state.records.length > 0;
  function resetFilters() {
    setSelected('all');
    props.setFilter('all');
  }
  return (
    <>
      <div className="dpr-record-layout">
        <RecordConversations
          conversations={conversations}
          selected={selectedKey}
          total={props.snapshot.state.records.length}
          onSelect={setSelected}
        />
        <section className="dpr-record-content" aria-label="会话处理记录">
          <header className="dpr-record-content-heading">
            <h2>{active?.label || '全部记录'}</h2>
            <div className="dpr-record-header-actions">
              <div className="dpr-record-toolbar">
                <FormItem label="筛选记录" hideLabel>
                  <Select
                    className="dpr-filter"
                    value={props.filter}
                    onChange={(event) => props.setFilter(event.target.value)}
                  >
                    {['all', 'draft', 'delivered', 'skipped', 'unknown', 'error', 'cancelled'].map(
                      (x) => (
                        <option key={x} value={x}>
                          {x === 'all' ? '全部记录' : labels[x]}
                        </option>
                      ),
                    )}
                  </Select>
                </FormItem>
              </div>
            </div>
          </header>
          <p className="dpr-help" aria-live="polite">
            当前显示 {records.length} 条 · 本地保留最近 30 条记录
          </p>
          <div
            ref={messages}
            className="dpr-record-messages"
            onScroll={() => {
              const area = messages.current;
              if (area)
                followLatest.current = area.scrollHeight - area.scrollTop - area.clientHeight < 80;
            }}
          >
            {records.length ? (
              <div className="dpr-chat-history">
                {[...records].reverse().map((record, index) => (
                  <RecordChat
                    key={`${record.time}-${index}`}
                    record={record}
                    name={
                      conversations.find((item) => item.key === recordConversationKey(record))
                        ?.label || record.sender
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="dpr-empty">
                <h2>{!hasRecords ? '还没有处理记录' : '没有符合条件的记录'}</h2>
                <p>
                  {!hasRecords
                    ? '先运行一次模型自检，确认回复生成正常。'
                    : '切换筛选，查看其他处理结果。'}
                </p>
                <div className="dpr-actions">
                  {!hasRecords ? (
                    <ActionButton
                      label="运行模型自检"
                      onClick={() => props.performAction('test')}
                      disabled={props.isBusy}
                    />
                  ) : (
                    <ActionButton label="查看全部" onClick={resetFilters} />
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

type RecordsProps = {
  snapshot: PluginSnapshot;
  isBusy: boolean;
  performAction: (endpoint: Endpoint, payload?: unknown) => Promise<void>;
  filter: string;
  setFilter: (filter: string) => void;
};
