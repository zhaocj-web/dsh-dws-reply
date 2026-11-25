import React, { useId, useLayoutEffect, useRef, useState } from 'react';

type TooltipProps = {
  label: string;
  content: string;
};

/** 提示不占据表单布局，Esc 可在保持焦点时关闭浮层。 */
export function Tooltip(props: TooltipProps) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const tooltip = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const visible = (hovered || focused) && !dismissed;

  useLayoutEffect(() => {
    const element = tooltip.current;
    const button = trigger.current;
    if (!visible || !element || !button) return;
    // 原生浮层进入 top layer，避免被页面滚动容器或设置弹窗裁剪。
    element.setAttribute('popover', 'manual');
    element.showPopover?.();
    function position() {
      if (!element || !button) return;
      const anchor = button.getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      const inset = 8;
      const left = Math.max(inset, Math.min(anchor.left, window.innerWidth - bounds.width - inset));
      const above = anchor.top - bounds.height - inset;
      const top =
        above >= inset
          ? above
          : Math.max(
              inset,
              Math.min(anchor.bottom + inset, window.innerHeight - bounds.height - inset),
            );
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
    }
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    const observer = new ResizeObserver(position);
    observer.observe(element);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      observer.disconnect();
      if (element.matches(':popover-open')) element.hidePopover();
    };
  }, [visible, props.content]);

  return (
    <span
      className="dpr-form-hint"
      onMouseEnter={() => {
        setHovered(true);
        setDismissed(false);
      }}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && visible) {
          setDismissed(true);
          event.stopPropagation();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="dpr-form-hint-button"
        aria-label={props.label}
        aria-describedby={visible ? id : undefined}
        onFocus={() => {
          setFocused(true);
          setDismissed(false);
        }}
        onBlur={() => setFocused(false)}
        onClick={() => setDismissed(false)}
      >
        ?
      </button>
      {visible && (
        <span ref={tooltip} id={id} role="tooltip" className="dpr-form-tooltip">
          {props.content}
        </span>
      )}
    </span>
  );
}
