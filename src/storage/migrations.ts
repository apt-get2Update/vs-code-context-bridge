import { ContextStore, CURRENT_SCHEMA_VERSION, AnyStoreVersion, StoreV1 } from '../types/store';

type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

const migrations: Record<number, MigrationFn> = {
  1: migrateV1ToV2,
};

export function migrateStore(data: unknown): ContextStore {
  if (!data || typeof data !== 'object') {
    return createEmptyStore();
  }

  let store = data as Record<string, unknown>;
  let version = typeof store.schemaVersion === 'number' ? store.schemaVersion : 1;

  while (version < CURRENT_SCHEMA_VERSION) {
    const migrateFn = migrations[version];
    if (!migrateFn) {
      throw new Error(
        `No migration path from schema version ${version} to ${version + 1}. ` +
          `Store may be from a newer version of Context Bridge.`,
      );
    }
    store = migrateFn(store);
    version++;
  }

  return store as unknown as ContextStore;
}

function migrateV1ToV2(data: Record<string, unknown>): Record<string, unknown> {
  const v1 = data as unknown as StoreV1;
  return {
    schemaVersion: 2,
    lastUpdated: new Date().toISOString(),
    memories: v1.memories ?? [],
  };
}

export function createEmptyStore(): ContextStore {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    lastUpdated: new Date().toISOString(),
    memories: [],
  };
}

export function needsMigration(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return true;
  }
  const store = data as AnyStoreVersion;
  return store.schemaVersion !== CURRENT_SCHEMA_VERSION;
}
