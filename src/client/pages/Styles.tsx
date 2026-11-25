import React, { useState } from 'react';
import type { ReplyConfig, ReplyStyle } from '../../shared/types';
import { presetReplyStyles } from '../../shared/reply-styles';
import { StyleCard } from '../components/StyleCard';
import { StyleEditor } from '../components/StyleEditor';
import { Tooltip } from '../components/Tooltip';

type StylesProps = {
  draftConfig: ReplyConfig;
  updateConfig: <K extends keyof ReplyConfig>(key: K, value: ReplyConfig[K]) => void;
};

export function Styles(props: StylesProps) {
  const [category, setCategory] = useState('全部');
  const [editing, setEditing] = useState<ReplyStyle | null>(null);
  const customStyles = props.draftConfig.replyStyles ?? [];
  const selectedId = props.draftConfig.activeStyleId ?? null;
  const active = [...presetReplyStyles, ...customStyles].find((style) => style.id === selectedId);
  const visibleStyles = [...customStyles, ...presetReplyStyles].filter(
    (style) =>
      category === '全部' ||
      (category === '我的'
        ? customStyles.some((item) => item.id === style.id)
        : style.category === category),
  );

  function edit(style?: ReplyStyle) {
    const custom = style && customStyles.some((item) => item.id === style.id);
    setEditing({
      id: crypto.randomUUID(),
      name: '',
      icon: '✦',
      category: '我的风格',
      summary: '',
      instructions: '',
      sample: '',
      ...style,
      ...(custom ? {} : { id: crypto.randomUUID(), name: style ? `${style.name}（自定义）` : '' }),
    });
  }
  function save(style: ReplyStyle) {
    props.updateConfig('replyStyles', [
      ...customStyles.filter((item) => item.id !== style.id),
      { ...style, category: '我的风格' },
    ]);
    setEditing(null);
  }
  function remove(style: ReplyStyle) {
    props.updateConfig(
      'replyStyles',
      customStyles.filter((item) => item.id !== style.id),
    );
    props.updateConfig(
      'conversationRules',
      props.draftConfig.conversationRules
        .map((rule) => (rule.styleId === style.id ? { ...rule, styleId: null } : rule))
        .filter((rule) => rule.rules.trim() || rule.replyModel || rule.styleId),
    );
    if (selectedId === style.id) props.updateConfig('activeStyleId', null);
  }
  function card(style: ReplyStyle, custom: boolean) {
    return (
      <StyleCard
        key={style.id}
        style={style}
        custom={custom}
        active={selectedId === style.id}
        onSelect={() =>
          props.updateConfig('activeStyleId', selectedId === style.id ? null : style.id)
        }
        onEdit={() => edit(style)}
        onDelete={() => remove(style)}
      />
    );
  }
  return (
    <>
      <div className="dpr-style-current">
        <span className="dpr-style-current-label">全局回复风格</span>
        <strong>{active ? `${active.icon} ${active.name}` : '默认表达'}</strong>
        <Tooltip
          label="风格生效说明"
          content="保存后作为默认风格；会话可单独选择其他风格，文字规则优先。未选择风格时沿用回复规则。"
        />
      </div>
      <section className="dpr-style-section" aria-label="风格列表">
        <header className="dpr-style-section-heading">
          <div className="dpr-style-filters" role="group" aria-label="风格分类">
            {['全部', '日常', '工作', '我的'].map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={item === category}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="dpr-btn"
            onClick={() => edit()}
            disabled={customStyles.length >= 50}
          >
            ＋ 添加风格
          </button>
        </header>
        {visibleStyles.length ? (
          <div className="dpr-style-grid">
            {visibleStyles.map((style) =>
              card(
                style,
                customStyles.some((item) => item.id === style.id),
              ),
            )}
          </div>
        ) : (
          <div className="dpr-style-empty">
            <p>还没有自定义风格</p>
            <button type="button" className="dpr-btn" onClick={() => edit()}>
              添加风格
            </button>
          </div>
        )}
      </section>
      {editing && <StyleEditor style={editing} onSave={save} onClose={() => setEditing(null)} />}
    </>
  );
}
