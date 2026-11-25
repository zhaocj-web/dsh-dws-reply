import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { errorMessage } from '../../shared/errors';
import { ActionButton } from './Controls';
import { FormItem, Input } from './Form';
export type SearchResult<Item> = {
  items: Item[];
  omitted: number;
  notice?: string;
  cursor?: string;
  hasMore?: boolean;
};
type SearchPickerProps<Item> = {
  load: (cursor?: string) => Promise<SearchResult<Item>>;
  search: (query: string) => Promise<SearchResult<Item>>;
  onSelect: (item: Item) => void;
  selectedIds?: string[];
  profile: string;
  label: string;
  placeholder: string;
  getId: (item: Item) => string;
  renderItem: (item: Item) => React.ReactNode;
};
/** 只有主动搜索才查询通讯录；输入变化或账号变化后丢弃旧结果。 */
export function SearchPicker<Item>(props: SearchPickerProps<Item>) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult<Item> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  const anchor = useRef<HTMLDivElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);
  const dropdownId = useId();
  const isOpen = result !== null;

  /** 使用原生浮层处理点击外部和 Escape 收起，避免结果撑开名单。 */
  useLayoutEffect(() => {
    const panel = dropdown.current;
    const field = anchor.current;
    if (!isOpen || !panel || !field) return;
    panel.setAttribute('popover', 'auto');
    panel.showPopover();
    function position() {
      if (!panel || !field) return;
      const rect = field.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const opensBelow = below >= 180 || below >= above;
      const available = Math.max(80, opensBelow ? below : above);
      panel.style.width = `${Math.min(rect.width, window.innerWidth - 16)}px`;
      panel.style.maxHeight = `${Math.min(360, available)}px`;
      panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - panel.offsetWidth - 8))}px`;
      panel.style.top = `${opensBelow ? rect.bottom + 6 : Math.max(8, rect.top - panel.offsetHeight - 6)}px`;
    }
    function onToggle() {
      if (!panel?.matches(':popover-open')) {
        requestId.current++;
        setResult(null);
        setBusy(false);
      }
    }
    position();
    panel.addEventListener('toggle', onToggle);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    const observer = new ResizeObserver(position);
    observer.observe(panel);
    return () => {
      panel.removeEventListener('toggle', onToggle);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      observer.disconnect();
      if (panel.matches(':popover-open')) panel.hidePopover();
    };
  }, [isOpen]);
  useEffect(() => {
    setResult(null);
    setError('');
    setBusy(false);
    requestId.current++;
    return () => {
      requestId.current++;
    };
  }, [props.profile]);
  async function submit(mode: 'search' | 'browse' | 'more' = 'search') {
    const current = ++requestId.current;
    setBusy(true);
    if (mode !== 'more') setResult(null);
    if (mode === 'browse') setQuery('');
    setError('');
    try {
      const found =
        mode === 'search'
          ? await props.search(query.trim())
          : await props.load(mode === 'more' ? result?.cursor : undefined);
      if (requestId.current === current)
        setResult((previous) => {
          if (mode !== 'more' || !previous) return found;
          const items = new Map(previous.items.map((item) => [props.getId(item), item]));
          for (const item of found.items) items.set(props.getId(item), item);
          return {
            ...found,
            items: [...items.values()],
            omitted: previous.omitted + found.omitted,
            notice: found.notice || previous.notice,
          };
        });
    } catch (error) {
      if (requestId.current === current) setError(errorMessage(error));
    } finally {
      if (requestId.current === current) setBusy(false);
    }
  }
  return (
    <div className="dpr-contact-search">
      <FormItem label={props.label} hideLabel={true}>
        <div ref={anchor} className="dpr-contact-search-row">
          <Input
            type="search"
            aria-expanded={isOpen}
            aria-controls={isOpen ? dropdownId : undefined}
            maxLength={100}
            placeholder={props.placeholder}
            value={query}
            onChange={(event) => {
              requestId.current++;
              setQuery(event.target.value);
              setResult(null);
              setError('');
              setBusy(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (query.trim() && !busy && props.profile) void submit();
              }
            }}
          />

          <ActionButton
            label={busy ? '加载中…' : '搜索'}
            disabled={busy || !query.trim() || !props.profile}
            onClick={() => void submit()}
          />
        </div>
      </FormItem>
      {!props.profile && <p className="dpr-help">请先关联钉钉账号。</p>}
      {error && (
        <p role="alert" className="dpr-error">
          {error}
        </p>
      )}
      {result && (
        <div
          ref={dropdown}
          id={dropdownId}
          className="dpr-search-dropdown"
          aria-label={props.label + '结果'}
          aria-live="polite"
        >
          <p className="dpr-help">
            本次返回 {result.items.length} 个候选
            {result.omitted ? `，${result.omitted} 项缺少开放 ID，无法添加` : ''}。
          </p>
          {result.notice && <p className="dpr-help">{result.notice}</p>}
          <ul className="dpr-contact-results">
            {result.items.map((item) => (
              <li key={props.getId(item)}>
                {props.renderItem(item)}
                <ActionButton
                  label={(props.selectedIds ?? []).includes(props.getId(item)) ? '已选择' : '选择'}
                  disabled={(props.selectedIds ?? []).includes(props.getId(item))}
                  onClick={() => {
                    props.onSelect(item);
                    requestId.current++;
                    setResult(null);
                    setBusy(false);
                  }}
                />
              </li>
            ))}
          </ul>
          <div className="dpr-actions">
            {result.hasMore && (
              <ActionButton
                label={busy ? '加载中…' : '加载更多'}
                disabled={busy}
                onClick={() => void submit('more')}
              />
            )}
            <button
              type="button"
              className="dpr-text-button"
              onClick={() => {
                requestId.current++;
                setResult(null);
                setBusy(false);
              }}
            >
              收起候选
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
