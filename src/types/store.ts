import { ContextMemory } from './context';

export const CURRENT_SCHEMA_VERSION = 2;

export interface ContextStore {
  schemaVersion: number;
  lastUpdated: string;
  memories: ContextMemory[];
}

export interface StoreV1 {
  schemaVersion: 1;
  memories: ContextMemory[];
}

export interface StoreV2 extends ContextStore {
  schemaVersion: 2;
}

export type AnyStoreVersion = StoreV1 | StoreV2;
