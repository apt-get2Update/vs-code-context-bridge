import * as path from 'path';
import { ValidationResult, MdcFrontmatter } from '../types/validation';
import { readFileSafe, findFiles } from '../utils/fs';
import { parseFrontmatter } from './extractor';

export async function validateContextFiles(rootPath: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  const cursorRulesDir = path.join(rootPath, '.cursor', 'rules');
  const mdcFiles = await findFiles(cursorRulesDir, /\.mdc$/);
  for (const file of mdcFiles) {
    const fileResults = await validateMdcFile(file, rootPath);
    results.push(...fileResults);
  }

  const docsDir = path.join(rootPath, 'docs');
  const workflowFiles = await findFiles(docsDir, /workflow/i);
  for (const file of workflowFiles) {
    const fileResults = await validateWorkflowDoc(file, rootPath);
    results.push(...fileResults);
  }

  return results;
}

export async function validateMdcFile(
  filePath: string,
  rootPath: string,
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const relPath = path.relative(rootPath, filePath);

  const content = await readFileSafe(filePath);
  if (!content) {
    results.push({
      file: relPath,
      severity: 'error',
      message: 'File is empty or unreadable.',
    });
    return results;
  }

  const { frontmatter, body } = parseFrontmatter(content);
  const fm = frontmatter as MdcFrontmatter;

  if (!hasFrontmatter(content)) {
    results.push({
      file: relPath,
      severity: 'error',
      message: 'Missing frontmatter block (---). MDC files require YAML frontmatter.',
      line: 1,
    });
    return results;
  }

  if (!fm.description || typeof fm.description !== 'string' || fm.description.trim() === '') {
    results.push({
      file: relPath,
      severity: 'error',
      message: 'Missing or empty "description" in frontmatter. Add a description field.',
      line: 2,
    });
  }

  const hasAlwaysApply = fm.alwaysApply !== undefined;
  const hasGlobs = fm.globs !== undefined;

  if (!hasAlwaysApply && !hasGlobs) {
    results.push({
      file: relPath,
      severity: 'warning',
      message:
        'Missing both "alwaysApply" and "globs" in frontmatter. At least one should be present.',
      line: 2,
    });
  }

  if (hasAlwaysApply && typeof fm.alwaysApply !== 'boolean') {
    results.push({
      file: relPath,
      severity: 'error',
      message: '"alwaysApply" must be a boolean (true or false).',
      line: 2,
    });
  }

  if (body.trim().length === 0) {
    results.push({
      file: relPath,
      severity: 'warning',
      message: 'MDC file body is empty. Consider adding rule content.',
    });
  }

  return results;
}

export async function validateWorkflowDoc(
  filePath: string,
  rootPath: string,
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const relPath = path.relative(rootPath, filePath);

  const content = await readFileSafe(filePath);
  if (!content) {
    results.push({
      file: relPath,
      severity: 'error',
      message: 'File is empty or unreadable.',
    });
    return results;
  }

  const lines = content.split(/\r?\n/);

  const hasTitle = lines.some((l) => /^#\s+/.test(l));
  if (!hasTitle) {
    results.push({
      file: relPath,
      severity: 'warning',
      message: 'Workflow doc is missing a top-level heading (# Title).',
      line: 1,
    });
  }

  const hasH2 = lines.some((l) => /^##\s+/.test(l));
  if (!hasH2) {
    results.push({
      file: relPath,
      severity: 'info',
      message: 'Consider adding section headings (## Section) for better organization.',
    });
  }

  if (content.trim().length < 50) {
    results.push({
      file: relPath,
      severity: 'warning',
      message: 'Workflow document appears very short. Consider adding more detail.',
    });
  }

  return results;
}

function hasFrontmatter(content: string): boolean {
  return content.trimStart().startsWith('---');
}
