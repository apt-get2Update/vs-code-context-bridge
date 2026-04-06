import * as assert from 'assert';
import * as path from 'path';
import {
  normalizePath,
  toRelativePath,
  ensurePosixSeparators,
  getDefaultStorePath,
} from '../../src/utils/platform';

describe('Platform Utils', () => {
  describe('normalizePath', () => {
    it('should convert path separators to forward slashes', () => {
      const input = ['src', 'core', 'extractor.ts'].join(path.sep);
      const result = normalizePath(input);
      assert.strictEqual(result, 'src/core/extractor.ts');
    });

    it('should handle already normalized paths', () => {
      const result = normalizePath('src/core/extractor.ts');
      assert.strictEqual(result, 'src/core/extractor.ts');
    });

    it('should handle empty string', () => {
      assert.strictEqual(normalizePath(''), '');
    });
  });

  describe('toRelativePath', () => {
    it('should create relative path from root', () => {
      const root = path.join('/projects', 'my-app');
      const file = path.join('/projects', 'my-app', 'src', 'index.ts');
      const result = toRelativePath(file, root);
      assert.strictEqual(result, 'src/index.ts');
    });
  });

  describe('ensurePosixSeparators', () => {
    it('should convert backslashes to forward slashes', () => {
      const result = ensurePosixSeparators('src\\core\\extractor.ts');
      assert.strictEqual(result, 'src/core/extractor.ts');
    });

    it('should not modify forward slashes', () => {
      const result = ensurePosixSeparators('src/core/extractor.ts');
      assert.strictEqual(result, 'src/core/extractor.ts');
    });
  });

  describe('getDefaultStorePath', () => {
    it('should return a path ending in .context-bridge/store.json', () => {
      const result = getDefaultStorePath();
      assert.ok(result.endsWith(path.join('.context-bridge', 'store.json')));
    });

    it('should be an absolute path', () => {
      const result = getDefaultStorePath();
      assert.ok(path.isAbsolute(result));
    });
  });
});
