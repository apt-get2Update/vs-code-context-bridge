import * as assert from 'assert';
import * as path from 'path';
import { validateMdcFile, validateWorkflowDoc } from '../../src/core/validator';

const FIXTURES_ROOT = path.resolve(__dirname, '..', '..', '..', 'fixtures');

describe('Validator', () => {
  describe('validateMdcFile', () => {
    it('should pass for valid MDC file', async () => {
      const file = path.join(
        FIXTURES_ROOT,
        'sample-project',
        '.cursor',
        'rules',
        'coding-standards.mdc',
      );
      const results = await validateMdcFile(file, path.join(FIXTURES_ROOT, 'sample-project'));
      const errors = results.filter((r) => r.severity === 'error');
      assert.strictEqual(errors.length, 0, `Expected no errors, got: ${JSON.stringify(errors)}`);
    });

    it('should report error for missing frontmatter', async () => {
      const file = path.join(FIXTURES_ROOT, 'malformed', 'no-frontmatter.mdc');
      const results = await validateMdcFile(file, FIXTURES_ROOT);

      const errors = results.filter((r) => r.severity === 'error');
      assert.ok(errors.length > 0, 'Should report at least one error');
      assert.ok(
        errors.some((e) => e.message.toLowerCase().includes('frontmatter')),
        'Should mention frontmatter',
      );
    });

    it('should report error for missing description', async () => {
      const file = path.join(FIXTURES_ROOT, 'malformed', 'bad-frontmatter.mdc');
      const results = await validateMdcFile(file, FIXTURES_ROOT);

      const errors = results.filter((r) => r.severity === 'error');
      assert.ok(
        errors.some((e) => e.message.toLowerCase().includes('description')),
        'Should flag missing description',
      );
    });

    it('should warn about empty body', async () => {
      const file = path.join(FIXTURES_ROOT, 'malformed', 'empty-body.mdc');
      const results = await validateMdcFile(file, FIXTURES_ROOT);

      const warnings = results.filter((r) => r.severity === 'warning');
      assert.ok(
        warnings.some((w) => w.message.toLowerCase().includes('empty')),
        'Should warn about empty body',
      );
    });

    it('should report error for non-existent file', async () => {
      const results = await validateMdcFile('/nonexistent.mdc', '/');
      assert.ok(results.length > 0);
      assert.strictEqual(results[0].severity, 'error');
    });
  });

  describe('validateWorkflowDoc', () => {
    it('should pass for valid workflow doc', async () => {
      const file = path.join(FIXTURES_ROOT, 'sample-project', 'docs', 'user-workflows.md');
      const results = await validateWorkflowDoc(file, path.join(FIXTURES_ROOT, 'sample-project'));
      const errors = results.filter((r) => r.severity === 'error');
      assert.strictEqual(errors.length, 0);
    });

    it('should report error for non-existent file', async () => {
      const results = await validateWorkflowDoc('/nonexistent.md', '/');
      assert.ok(results.length > 0);
      assert.strictEqual(results[0].severity, 'error');
    });
  });
});
