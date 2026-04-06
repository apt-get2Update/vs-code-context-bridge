import * as assert from 'assert';
import { createContextMemory, mergeContextMemories } from '../../src/core/context-model';
import { ContextMemory, ProjectMetadata } from '../../src/types/context';

function makeMetadata(name: string): ProjectMetadata {
  return {
    name,
    languages: ['TypeScript'],
    frameworks: ['Express'],
    runtimeHints: ['Node.js >=20'],
    rootPath: `/tmp/${name}`,
    capturedAt: new Date().toISOString(),
  };
}

describe('Context Model', () => {
  describe('createContextMemory', () => {
    it('should create memory with a unique ID', () => {
      const meta = makeMetadata('test-project');
      const memory = createContextMemory(meta);
      assert.ok(memory.id);
      assert.ok(memory.id.length > 0);
    });

    it('should initialize all arrays as empty', () => {
      const meta = makeMetadata('test');
      const memory = createContextMemory(meta);
      assert.strictEqual(memory.architecturePatterns.length, 0);
      assert.strictEqual(memory.endpoints.length, 0);
      assert.strictEqual(memory.workflows.length, 0);
      assert.strictEqual(memory.serviceBoundaries.length, 0);
      assert.strictEqual(memory.envKeys.length, 0);
      assert.strictEqual(memory.mappingRules.length, 0);
      assert.strictEqual(memory.cursorRules.length, 0);
      assert.strictEqual(memory.rawSections.length, 0);
    });
  });

  describe('mergeContextMemories', () => {
    it('should merge languages without duplicates', () => {
      const existing: ContextMemory = {
        ...createContextMemory(makeMetadata('proj')),
        project: {
          ...makeMetadata('proj'),
          languages: ['TypeScript', 'JavaScript'],
        },
      };
      const incoming: ContextMemory = {
        ...createContextMemory(makeMetadata('proj')),
        project: {
          ...makeMetadata('proj'),
          languages: ['TypeScript', 'Python'],
        },
      };

      const merged = mergeContextMemories(existing, incoming);
      assert.deepStrictEqual(merged.project.languages.sort(), [
        'JavaScript',
        'Python',
        'TypeScript',
      ]);
    });

    it('should merge frameworks without duplicates', () => {
      const existing: ContextMemory = {
        ...createContextMemory(makeMetadata('proj')),
        project: { ...makeMetadata('proj'), frameworks: ['Express'] },
      };
      const incoming: ContextMemory = {
        ...createContextMemory(makeMetadata('proj')),
        project: { ...makeMetadata('proj'), frameworks: ['Express', 'React'] },
      };

      const merged = mergeContextMemories(existing, incoming);
      assert.deepStrictEqual(merged.project.frameworks.sort(), ['Express', 'React']);
    });

    it('should update capturedAt to incoming timestamp', () => {
      const existing = createContextMemory({
        ...makeMetadata('proj'),
        capturedAt: '2024-01-01T00:00:00.000Z',
      });
      const incoming = createContextMemory({
        ...makeMetadata('proj'),
        capturedAt: '2024-06-15T00:00:00.000Z',
      });

      const merged = mergeContextMemories(existing, incoming);
      assert.strictEqual(merged.project.capturedAt, '2024-06-15T00:00:00.000Z');
    });

    it('should deduplicate workflows by name', () => {
      const existing: ContextMemory = {
        ...createContextMemory(makeMetadata('proj')),
        workflows: [{ name: 'Login', description: 'old', steps: [], services: [] }],
      };
      const incoming: ContextMemory = {
        ...createContextMemory(makeMetadata('proj')),
        workflows: [
          { name: 'Login', description: 'updated', steps: ['new step'], services: [] },
          { name: 'Register', description: 'new', steps: [], services: [] },
        ],
      };

      const merged = mergeContextMemories(existing, incoming);
      assert.strictEqual(merged.workflows.length, 2);
      const login = merged.workflows.find((w) => w.name === 'Login');
      assert.strictEqual(login?.description, 'updated');
    });

    it('should deduplicate envKeys by key', () => {
      const existing: ContextMemory = {
        ...createContextMemory(makeMetadata('proj')),
        envKeys: [{ key: 'DB_URL', description: '', source: '.env' }],
      };
      const incoming: ContextMemory = {
        ...createContextMemory(makeMetadata('proj')),
        envKeys: [
          { key: 'DB_URL', description: 'updated', source: '.env' },
          { key: 'API_KEY', description: '', source: '.env' },
        ],
      };

      const merged = mergeContextMemories(existing, incoming);
      assert.strictEqual(merged.envKeys.length, 2);
    });
  });
});
