import type { ComponentType } from 'react';
import type { RpcClient } from '../shared/types';
export type NumericConfigKey =
  'cooldownSeconds' | 'maxReplyChars' | 'historyTurns' | 'maxAgeSeconds';
interface SlotDefinition {
  name: string;
  key?: string;
  id?: string;
  order?: number;
  label?: () => string;
}
export interface ClientContext {
  get(name: 'connection'): {
    rpc: RpcClient;
  };
  slots: {
    inject(name: string, register: () => unknown): unknown;
    register<P>(definition: SlotDefinition, component: ComponentType<P>): unknown;
  };
}
