import * as assert from 'assert';
import { scoreMemory } from '../../src/core/matcher';
import { ContextMemory } from '../../src/types/context';

function createTestMemory(overrides: Partial<ContextMemory> = {}): ContextMemory {
  return {
    id: 'test-memory',
    project: {
      name: 'test-project',
      languages: ['TypeScript', 'JavaScript'],
      frameworks: ['Express'],
      runtimeHints: ['Node.js >=20'],
      rootPath: '/tmp/test-project',
      capturedAt: '2024-01-01T00:00:00.000Z',
    },
    architecturePatterns: [],
    endpoints: [
      { method: 'GET', path: '/api/users', description: 'List users' },
      { method: 'POST', path: '/api/users', description: 'Create user' },
    ],
    workflows: [
      {
        name: 'User Registration',
        description: 'Register a new user in the system',
        steps: ['Submit form', 'Validate', 'Save'],
        services: ['user-service', 'auth-service'],
      },
    ],
    serviceBoundaries: [],
    envKeys: [],
    mappingRules: [],
    cursorRules: [
      {
        filePath: '.cursor/rules/coding.mdc',
        description: 'Coding standards',
        alwaysApply: true,
        globs: ['**/*.ts'],
        content: 'Use TypeScript strict mode with express controllers',
      },
    ],
    rawSections: [
      {
        source: 'README.md',
        heading: 'Introduction',
        content: 'A REST API for user management with express and typescript',
      },
    ],
    ...overrides,
  };
}

interface TestLocalSignature {
  name: string;
  languages: string[];
  frameworks: string[];
  fileNames: string[];
  keywords: Set<string>;
  endpoints: string[];
}

function createTestLocal(overrides: Partial<TestLocalSignature> = {}): TestLocalSignature {
  return {
    name: 'local-project',
    languages: ['TypeScript'],
    frameworks: ['Express'],
    fileNames: ['index.ts', 'app.ts', 'router.ts'],
    keywords: new Set(['express', 'typescript', 'users', 'authentication', 'rest']),
    endpoints: [],
    ...overrides,
  };
}

describe('Matcher', () => {
  describe('scoreMemory', () => {
    it('should return a positive score for related projects', () => {
      const memory = createTestMemory();
      const local = createTestLocal();

      const breakdown = scoreMemory(memory, local);
      assert.ok(breakdown.totalScore > 0, `Score should be positive, got ${breakdown.totalScore}`);
    });

    it('should score framework overlap', () => {
      const memory = createTestMemory();
      const local = createTestLocal({ frameworks: ['Express'] });

      const breakdown = scoreMemory(memory, local);
      assert.ok(
        breakdown.frameworkScore > 0,
        'Framework score should be positive when frameworks match',
      );
    });

    it('should return zero framework score for non-matching frameworks', () => {
      const memory = createTestMemory();
      const local = createTestLocal({ frameworks: ['Django'] });

      const breakdown = scoreMemory(memory, local);
      assert.strictEqual(breakdown.frameworkScore, 0);
    });

    it('should score keyword overlap', () => {
      const memory = createTestMemory();
      const local = createTestLocal({
        keywords: new Set(['express', 'typescript', 'controllers', 'strict']),
      });

      const breakdown = scoreMemory(memory, local);
      assert.ok(breakdown.keywordScore > 0, 'Keyword score should be positive');
    });

    it('should return zero for completely unrelated projects', () => {
      const memory = createTestMemory({
        project: {
          name: 'unrelated',
          languages: ['Rust'],
          frameworks: ['Actix'],
          runtimeHints: [],
          rootPath: '/tmp/unrelated',
          capturedAt: '2024-01-01T00:00:00.000Z',
        },
        rawSections: [
          {
            source: 'README.md',
            heading: 'Intro',
            content: 'A systems programming project for embedded devices',
          },
        ],
        cursorRules: [],
      });
      const local = createTestLocal({
        keywords: new Set(['flutter', 'dart', 'mobile', 'android']),
        frameworks: ['Flutter'],
      });

      const breakdown = scoreMemory(memory, local);
      assert.ok(breakdown.totalScore < 0.1, `Expected low score, got ${breakdown.totalScore}`);
    });

    it('should produce deterministic scores', () => {
      const memory = createTestMemory();
      const local = createTestLocal();

      const score1 = scoreMemory(memory, local);
      const score2 = scoreMemory(memory, local);

      assert.strictEqual(score1.totalScore, score2.totalScore);
      assert.strictEqual(score1.keywordScore, score2.keywordScore);
      assert.strictEqual(score1.frameworkScore, score2.frameworkScore);
    });

    it('should have total score as weighted combination', () => {
      const memory = createTestMemory();
      const local = createTestLocal();

      const bd = scoreMemory(memory, local);
      const expected =
        bd.keywordScore * 0.25 +
        bd.fileSignatureScore * 0.2 +
        bd.frameworkScore * 0.25 +
        bd.endpointScore * 0.15 +
        bd.workflowScore * 0.15;

      assert.ok(
        Math.abs(bd.totalScore - expected) < 0.001,
        `Total score ${bd.totalScore} should match weighted sum ${expected}`,
      );
    });
  });
});
