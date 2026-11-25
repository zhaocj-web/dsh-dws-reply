import React from 'react';
import { App } from './App';
import { Icon } from './components/Icon';
import type { ClientContext } from './types';
export const name = 'dsh-dws-personal-reply';
export const inject = ['slots', 'connection'];
/** 注册左侧入口和独立工作台页面，不向 DSH 设置页添加项目。 */
export function apply(context: ClientContext): void {
  const connection = context.get('connection');
  const Workspace = () => <App rpc={connection.rpc} />;
  context.slots.inject('main', () =>
    context.slots.register({ name: 'main', key: 'dws-personal-reply' }, Workspace),
  );
  context.slots.inject('sidebar.panellist', () =>
    context.slots.register(
      {
        name: 'sidebar.panellist',
        id: 'dws-personal-reply',
        order: 6,
        label: () => '钉钉个人代答',
      },
      Icon,
    ),
  );
}
