import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { migrateStore, createEmptyStore, needsMigration } from '../../src/storage/migrations';
import { CURRENT_SCHEMA_VERSION } from '../../src/types/store';

const FIXTURES_ROOT = path.resolve(__dirname, '..', '..', '..', 'fixtures');

describe('Migrations', () => {
  describe('createEmptyStore', () => {
    it('should create store with current schema version', () => {
      const store = createEmptyStore();
      assert.strictEqual(store.schemaVersion, CURRENT_SCHEMA_VERSION);
    });

    it('should create store with empty memories array', () => {
      const store = createEmptyStore();
      assert.ok(Array.isArray(store.memories));
      assert.strictEqual(store.memories.length, 0);
    });

    it('should include lastUpdated timestamp', () => {
      const store = createEmptyStore();
      assert.ok(store.lastUpdated);
      const date = new Date(store.lastUpdated);
      assert.ok(!isNaN(date.getTime()));
    });
  });

  describe('needsMigration', () => {
    it('should return true for null data', () => {
      assert.strictEqual(needsMigration(null), true);
    });

    it('should return true for non-object data', () => {
      assert.strictEqual(needsMigration('string'), true);
    });

    it('should return true for old schema version', () => {
      assert.strictEqual(needsMigration({ schemaVersion: 1 }), true);
    });

    it('should return false for current schema version', () => {
      assert.strictEqual(needsMigration({ schemaVersion: CURRENT_SCHEMA_VERSION }), false);
    });
  });

  describe('migrateStore', () => {
    it('should migrate v1 store to current version', () => {
      const v1Raw = fs.readFileSync(path.join(FIXTURES_ROOT, 'sample-store-v1.json'), 'utf-8');
      const v1Data: unknown = JSON.parse(v1Raw);

      const migrated = migrateStore(v1Data);
      assert.strictEqual(migrated.schemaVersion, CURRENT_SCHEMA_VERSION);
      assert.ok(migrated.lastUpdated);
      assert.ok(Array.isArray(migrated.memories));
      assert.strictEqual(migrated.memories.length, 1);
    });

    it('should preserve memories during migration', () => {
      const v1Data = {
        schemaVersion: 1,
        memories: [
          {
            id: 'test',
            project: {
              name: 'test-proj',
              languages: ['Go'],
              frameworks: [],
              runtimeHints: [],
              rootPath: '/tmp/test',
              capturedAt: '2024-01-01',
            },
            architecturePatterns: [],
            endpoints: [],
            workflows: [],
            serviceBoundaries: [],
            envKeys: [],
            mappingRules: [],
            cursorRules: [],
            rawSections: [],
          },
        ],
      };

      const migrated = migrateStore(v1Data);
      assert.strictEqual(migrated.memories[0].project.name, 'test-proj');
      assert.ok(migrated.memories[0].project.languages.includes('Go'));
    });

    it('should create empty store for null input', () => {
      const store = migrateStore(null);
      assert.strictEqual(store.schemaVersion, CURRENT_SCHEMA_VERSION);
      assert.strictEqual(store.memories.length, 0);
    });

    it('should create empty store for invalid input', () => {
      const store = migrateStore('not an object');
      assert.strictEqual(store.schemaVersion, CURRENT_SCHEMA_VERSION);
      assert.strictEqual(store.memories.length, 0);
    });
  });
});
