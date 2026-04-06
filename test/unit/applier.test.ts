import * as assert from 'assert';
import {
  generateMdcContent,
  generateWorkflowContent,
  hasDuplicateImport,
} from '../../src/core/applier';
import { ContextMemory } from '../../src/types/context';

function createTestMemory(): ContextMemory {
  return {
    id: 'apply-test',
    project: {
      name: 'source-project',
      languages: ['TypeScript'],
      frameworks: ['React'],
      runtimeHints: ['Node.js >=20'],
      rootPath: '/tmp/source-project',
      capturedAt: '2024-06-15T10:00:00.000Z',
    },
    architecturePatterns: [
      {
        name: 'Component Architecture',
        description: 'React component-based architecture with hooks',
        files: ['src/components/'],
      },
    ],
    endpoints: [{ method: 'GET', path: '/api/products', description: 'List products' }],
    workflows: [
      {
        name: 'Order Processing',
        description: 'Process customer orders from cart to fulfillment',
        steps: ['Add to cart', 'Checkout', 'Payment', 'Fulfillment'],
        services: ['cart-service', 'payment-service'],
      },
    ],
    serviceBoundaries: [{ name: 'cart-service', description: 'Shopping cart', dependencies: [] }],
    envKeys: [{ key: 'STRIPE_KEY', description: '', source: '.env.example' }],
    mappingRules: [
      {
        name: 'Cart to Order Mapping',
        description: 'Maps cart items to order line items',
        sourcePattern: 'CartItem',
        targetPattern: 'OrderItem',
      },
    ],
    cursorRules: [
      {
        filePath: '.cursor/rules/react.mdc',
        description: 'React component guidelines',
        alwaysApply: true,
        globs: ['src/**/*.tsx'],
        content: 'Use functional components with TypeScript props interfaces.',
      },
    ],
    rawSections: [],
  };
}

describe('Applier', () => {
  describe('generateMdcContent', () => {
    it('should generate MDC content with frontmatter for new file', () => {
      const memory = createTestMemory();
      const content = generateMdcContent(memory, null);

      assert.ok(content.startsWith('---'), 'Should start with frontmatter');
      assert.ok(content.includes('description:'));
      assert.ok(content.includes('alwaysApply:'));
      assert.ok(content.includes('globs:'));
      assert.ok(content.includes('Context Bridge Import'));
      assert.ok(content.includes('source-project'));
    });

    it('should include cursor rules in generated content', () => {
      const memory = createTestMemory();
      const content = generateMdcContent(memory, null);

      assert.ok(content.includes('React component guidelines'));
      assert.ok(content.includes('functional components'));
    });

    it('should include architecture patterns', () => {
      const memory = createTestMemory();
      const content = generateMdcContent(memory, null);

      assert.ok(content.includes('Architecture Patterns'));
      assert.ok(content.includes('Component Architecture'));
    });

    it('should include mapping rules', () => {
      const memory = createTestMemory();
      const content = generateMdcContent(memory, null);

      assert.ok(content.includes('Mapping Rules'));
      assert.ok(content.includes('Cart to Order Mapping'));
    });

    it('should append to existing content', () => {
      const memory = createTestMemory();
      const existing =
        '---\ndescription: Existing rules\nalwaysApply: false\n---\n\n# Existing content\n\nSome rules here.';
      const content = generateMdcContent(memory, existing);

      assert.ok(content.includes('Existing content'));
      assert.ok(content.includes('source-project'));
    });

    it('should be idempotent - replace existing import on re-apply', () => {
      const memory = createTestMemory();
      const first = generateMdcContent(memory, null);
      const second = generateMdcContent(memory, first);

      const importCount = (second.match(/\[Context Bridge Import\]/g) || []).length;
      assert.strictEqual(importCount, 1, 'Should have exactly one import section after re-apply');
    });
  });

  describe('generateWorkflowContent', () => {
    it('should generate workflow doc for new file', () => {
      const memory = createTestMemory();
      const content = generateWorkflowContent(memory, null);

      assert.ok(content.includes('Context Bridge'));
      assert.ok(content.includes('source-project'));
      assert.ok(content.includes('Order Processing'));
    });

    it('should include endpoints', () => {
      const memory = createTestMemory();
      const content = generateWorkflowContent(memory, null);

      assert.ok(content.includes('GET'));
      assert.ok(content.includes('/api/products'));
    });

    it('should include workflow steps', () => {
      const memory = createTestMemory();
      const content = generateWorkflowContent(memory, null);

      assert.ok(content.includes('Add to cart'));
      assert.ok(content.includes('Checkout'));
      assert.ok(content.includes('Payment'));
    });

    it('should include service boundaries', () => {
      const memory = createTestMemory();
      const content = generateWorkflowContent(memory, null);

      assert.ok(content.includes('cart-service'));
    });

    it('should include env keys', () => {
      const memory = createTestMemory();
      const content = generateWorkflowContent(memory, null);

      assert.ok(content.includes('STRIPE_KEY'));
    });

    it('should be idempotent - replace existing import on re-apply', () => {
      const memory = createTestMemory();
      const first = generateWorkflowContent(memory, null);
      const second = generateWorkflowContent(memory, first);

      const importCount = (second.match(/source="source-project"/g) || []).length;
      assert.strictEqual(importCount, 1, 'Should have exactly one import marker after re-apply');
    });
  });

  describe('hasDuplicateImport', () => {
    it('should detect existing import by source attribute', () => {
      const content = '<!-- context-bridge-import-start source="my-project" time="2024" -->';
      assert.strictEqual(hasDuplicateImport(content, 'my-project'), true);
    });

    it('should detect existing import by source comment', () => {
      const content = '<!-- source: my-project, imported: 2024 -->';
      assert.strictEqual(hasDuplicateImport(content, 'my-project'), true);
    });

    it('should return false when no matching import exists', () => {
      const content = 'Some normal content without imports';
      assert.strictEqual(hasDuplicateImport(content, 'my-project'), false);
    });
  });
});
