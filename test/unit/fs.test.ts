import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { readFileSafe, writeFileSafe, fileExists, findFiles } from '../../src/utils/fs';

describe('FS Utils', () => {
  const tmpDir = path.join(os.tmpdir(), 'context-bridge-test-' + Date.now());

  before(async () => {
    await fs.promises.mkdir(tmpDir, { recursive: true });
  });

  after(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  describe('readFileSafe', () => {
    it('should read existing file', async () => {
      const file = path.join(tmpDir, 'read-test.txt');
      await fs.promises.writeFile(file, 'hello world', 'utf-8');

      const content = await readFileSafe(file);
      assert.strictEqual(content, 'hello world');
    });

    it('should return null for non-existent file', async () => {
      const content = await readFileSafe(path.join(tmpDir, 'does-not-exist.txt'));
      assert.strictEqual(content, null);
    });
  });

  describe('writeFileSafe', () => {
    it('should create file and intermediate directories', async () => {
      const file = path.join(tmpDir, 'subdir', 'deep', 'write-test.txt');
      await writeFileSafe(file, 'test content');

      const content = await fs.promises.readFile(file, 'utf-8');
      assert.strictEqual(content, 'test content');
    });

    it('should overwrite existing file', async () => {
      const file = path.join(tmpDir, 'overwrite-test.txt');
      await writeFileSafe(file, 'first');
      await writeFileSafe(file, 'second');

      const content = await fs.promises.readFile(file, 'utf-8');
      assert.strictEqual(content, 'second');
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const file = path.join(tmpDir, 'exists-test.txt');
      await fs.promises.writeFile(file, 'data');
      assert.strictEqual(await fileExists(file), true);
    });

    it('should return false for non-existent file', async () => {
      assert.strictEqual(await fileExists(path.join(tmpDir, 'nope.txt')), false);
    });
  });

  describe('findFiles', () => {
    it('should find files matching pattern recursively', async () => {
      const dir = path.join(tmpDir, 'find-test');
      await fs.promises.mkdir(path.join(dir, 'sub'), { recursive: true });
      await fs.promises.writeFile(path.join(dir, 'a.ts'), '');
      await fs.promises.writeFile(path.join(dir, 'b.js'), '');
      await fs.promises.writeFile(path.join(dir, 'sub', 'c.ts'), '');

      const tsFiles = await findFiles(dir, /\.ts$/);
      assert.strictEqual(tsFiles.length, 2);
    });

    it('should return empty array for non-existent directory', async () => {
      const files = await findFiles('/nonexistent/path', /\.ts$/);
      assert.deepStrictEqual(files, []);
    });

    it('should skip node_modules', async () => {
      const dir = path.join(tmpDir, 'nm-test');
      await fs.promises.mkdir(path.join(dir, 'node_modules'), { recursive: true });
      await fs.promises.writeFile(path.join(dir, 'app.ts'), '');
      await fs.promises.writeFile(path.join(dir, 'node_modules', 'pkg.ts'), '');

      const files = await findFiles(dir, /\.ts$/);
      assert.strictEqual(files.length, 1);
      assert.ok(files[0].endsWith('app.ts'));
    });
  });
});
