import * as assert from 'assert';
import * as path from 'path';
import {
  parseMdcFile,
  parseFrontmatter,
  splitMarkdownIntoSections,
  extractContext,
} from '../../src/core/extractor';

const FIXTURES_ROOT = path.resolve(__dirname, '..', '..', '..', 'fixtures');

describe('Extractor', () => {
  describe('parseFrontmatter', () => {
    it('should parse valid YAML frontmatter', () => {
      const content = [
        '---',
        'description: My rule',
        'alwaysApply: true',
        'globs: src/**/*.ts',
        '---',
        '',
        'Rule body content',
      ].join('\n');

      const { frontmatter, body } = parseFrontmatter(content);
      assert.strictEqual(frontmatter['description'], 'My rule');
      assert.strictEqual(frontmatter['alwaysApply'], true);
      assert.strictEqual(frontmatter['globs'], 'src/**/*.ts');
      assert.ok(body.includes('Rule body content'));
    });

    it('should handle content without frontmatter', () => {
      const content = 'Just some content without frontmatter';
      const { frontmatter, body } = parseFrontmatter(content);
      assert.deepStrictEqual(frontmatter, {});
      assert.strictEqual(body, content);
    });

    it('should parse boolean values correctly', () => {
      const content = '---\nalwaysApply: false\n---\nbody';
      const { frontmatter } = parseFrontmatter(content);
      assert.strictEqual(frontmatter['alwaysApply'], false);
    });

    it('should parse numeric values', () => {
      const content = '---\npriority: 10\n---\nbody';
      const { frontmatter } = parseFrontmatter(content);
      assert.strictEqual(frontmatter['priority'], 10);
    });
  });

  describe('parseMdcFile', () => {
    it('should parse a valid MDC file from fixtures', async () => {
      const filePath = path.join(
        FIXTURES_ROOT,
        'sample-project',
        '.cursor',
        'rules',
        'coding-standards.mdc',
      );
      const rootPath = path.join(FIXTURES_ROOT, 'sample-project');

      const rule = await parseMdcFile(filePath, rootPath);
      assert.ok(rule, 'Rule should not be null');
      assert.strictEqual(rule.description, 'Coding standards for the sample API project');
      assert.strictEqual(rule.alwaysApply, true);
      assert.ok(rule.globs.length > 0);
      assert.ok(rule.content.includes('TypeScript strict mode'));
    });

    it('should return null for non-existent file', async () => {
      const result = await parseMdcFile('/nonexistent/file.mdc', '/nonexistent');
      assert.strictEqual(result, null);
    });

    it('should redact secrets in MDC content', async () => {
      const filePath = path.join(
        FIXTURES_ROOT,
        'sample-project',
        '.cursor',
        'rules',
        'coding-standards.mdc',
      );
      const rootPath = path.join(FIXTURES_ROOT, 'sample-project');

      const rule = await parseMdcFile(filePath, rootPath);
      assert.ok(rule);
      assert.ok(!rule.content.includes('password='));
    });
  });

  describe('splitMarkdownIntoSections', () => {
    it('should split markdown by headings', () => {
      const content = [
        '# Title',
        'Intro text',
        '## Section One',
        'Content for section one',
        '## Section Two',
        'Content for section two',
      ].join('\n');

      const sections = splitMarkdownIntoSections(content, 'test.md');
      assert.strictEqual(sections.length, 3);
      assert.strictEqual(sections[0].heading, 'Title');
      assert.strictEqual(sections[1].heading, 'Section One');
      assert.strictEqual(sections[2].heading, 'Section Two');
    });

    it('should handle content without headings', () => {
      const content = 'Just plain text\nwith multiple lines';
      const sections = splitMarkdownIntoSections(content, 'test.md');
      assert.strictEqual(sections.length, 1);
      assert.strictEqual(sections[0].heading, 'Introduction');
    });

    it('should skip empty sections', () => {
      const content = '# Title\n\n## Empty\n\n## Has Content\nSome content';
      const sections = splitMarkdownIntoSections(content, 'test.md');
      const hasContent = sections.find((s) => s.heading === 'Has Content');
      assert.ok(hasContent);
    });

    it('should set source correctly', () => {
      const content = '# Test\nContent';
      const sections = splitMarkdownIntoSections(content, 'docs/test.md');
      assert.strictEqual(sections[0].source, 'docs/test.md');
    });
  });

  describe('extractContext', () => {
    it('should extract context from sample project fixture', async () => {
      const rootPath = path.join(FIXTURES_ROOT, 'sample-project');
      const memory = await extractContext(rootPath, {
        captureReadme: true,
        captureAgentsMd: false,
      });

      assert.ok(memory.id);
      assert.strictEqual(memory.project.name, 'sample-project');
      assert.ok(memory.project.languages.includes('TypeScript'));
      assert.ok(memory.project.frameworks.includes('Express'));
      assert.ok(memory.cursorRules.length >= 2);
      assert.ok(memory.workflows.length > 0);
      assert.ok(memory.envKeys.length > 0);
    });

    it('should detect languages and frameworks from package.json', async () => {
      const rootPath = path.join(FIXTURES_ROOT, 'sample-project');
      const memory = await extractContext(rootPath, {
        captureReadme: false,
        captureAgentsMd: false,
      });

      assert.ok(memory.project.languages.includes('TypeScript'));
      assert.ok(memory.project.languages.includes('JavaScript'));
    });

    it('should extract env keys from .env.example', async () => {
      const rootPath = path.join(FIXTURES_ROOT, 'sample-project');
      const memory = await extractContext(rootPath, {
        captureReadme: false,
        captureAgentsMd: false,
      });

      const keys = memory.envKeys.map((e) => e.key);
      assert.ok(keys.includes('DATABASE_URL'));
      assert.ok(keys.includes('JWT_SECRET'));
      assert.ok(keys.includes('API_PORT'));
    });

    it('should handle non-existent project gracefully', async () => {
      const rootPath = '/tmp/nonexistent-project-12345';
      const memory = await extractContext(rootPath, {
        captureReadme: true,
        captureAgentsMd: true,
      });

      assert.ok(memory.id);
      assert.strictEqual(memory.cursorRules.length, 0);
      assert.strictEqual(memory.workflows.length, 0);
    });
  });
});
