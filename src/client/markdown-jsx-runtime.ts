import React from 'react';

type ElementProps = Record<string, unknown> | null;

export const Fragment = React.Fragment;

/** Markdown 依赖自动 JSX 运行时；统一转到 DSH 已提供的 React，避免额外宿主模块依赖。 */
export function jsx(type: React.ElementType, props: ElementProps, key?: React.Key) {
  return React.createElement(type, {
    ...props,
    ...(key === undefined ? {} : { key }),
  });
}

export const jsxs = jsx;
