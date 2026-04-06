import * as path from 'path';
import { ContextMemory } from '../types/context';
import { readFileSafe, writeFileSafe, fileExists } from '../utils/fs';

const IMPORT_MARKER_START = '<!-- context-bridge-import-start';
const IMPORT_MARKER_END = '<!-- context-bridge-import-end -->';
const MDC_IMPORT_MARKER = '# [Context Bridge Import]';

export interface ApplyPreview {
  mdcPath: string;
  mdcContent: string;
  workflowPath: string;
  workflowContent: string;
  isUpdate: boolean;
}

export interface ApplyResult {
  mdcPath: string;
  workflowPath: string;
  filesWritten: number;
}

export async function previewApply(rootPath: string, memory: ContextMemory): Promise<ApplyPreview> {
  const mdcPath = path.join(rootPath, '.cursor', 'rules', 'context-bridge-imported.mdc');
  const workflowPath = path.join(rootPath, 'docs', 'context-bridge-imported-workflows.md');

  const existingMdc = await readFileSafe(mdcPath);
  const existingWorkflow = await readFileSafe(workflowPath);

  const mdcContent = generateMdcContent(memory, existingMdc);
  const workflowContent = generateWorkflowContent(memory, existingWorkflow);

  const isUpdate = (await fileExists(mdcPath)) || (await fileExists(workflowPath));

  return {
    mdcPath,
    mdcContent,
    workflowPath,
    workflowContent,
    isUpdate,
  };
}

export async function applyContext(rootPath: string, memory: ContextMemory): Promise<ApplyResult> {
  const preview = await previewApply(rootPath, memory);

  await writeFileSafe(preview.mdcPath, preview.mdcContent);
  await writeFileSafe(preview.workflowPath, preview.workflowContent);

  return {
    mdcPath: preview.mdcPath,
    workflowPath: preview.workflowPath,
    filesWritten: 2,
  };
}

export function generateMdcContent(memory: ContextMemory, existingContent: string | null): string {
  const timestamp = new Date().toISOString();
  const importId = `${memory.project.name}@${timestamp}`;

  const newSection = buildMdcImportSection(memory, importId, timestamp);

  if (!existingContent) {
    const frontmatter = [
      '---',
      'description: Imported context from Context Bridge',
      'alwaysApply: false',
      `globs: **/*`,
      '---',
      '',
    ].join('\n');
    return frontmatter + newSection;
  }

  if (hasDuplicateImport(existingContent, memory.project.name)) {
    return replaceExistingImport(existingContent, memory.project.name, newSection);
  }

  return existingContent.trimEnd() + '\n\n' + newSection;
}

function buildMdcImportSection(memory: ContextMemory, importId: string, timestamp: string): string {
  const lines: string[] = [];
  lines.push(`${MDC_IMPORT_MARKER} ${importId}`);
  lines.push(`<!-- source: ${memory.project.name}, imported: ${timestamp} -->`);
  lines.push('');

  if (memory.cursorRules.length > 0) {
    lines.push('## Imported Rules');
    lines.push('');
    for (const rule of memory.cursorRules) {
      lines.push(`### ${rule.filePath}`);
      if (rule.description) {
        lines.push(`> ${rule.description}`);
      }
      lines.push('');
      lines.push(rule.content);
      lines.push('');
    }
  }

  if (memory.architecturePatterns.length > 0) {
    lines.push('## Architecture Patterns');
    lines.push('');
    for (const pat of memory.architecturePatterns) {
      lines.push(`- **${pat.name}**: ${pat.description}`);
    }
    lines.push('');
  }

  if (memory.mappingRules.length > 0) {
    lines.push('## Mapping Rules');
    lines.push('');
    for (const rule of memory.mappingRules) {
      lines.push(`- **${rule.name}**: ${rule.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function generateWorkflowContent(
  memory: ContextMemory,
  existingContent: string | null,
): string {
  const timestamp = new Date().toISOString();
  const newSection = buildWorkflowImportSection(memory, timestamp);

  if (!existingContent) {
    return `# Context Bridge - Imported Workflows\n\n${newSection}`;
  }

  if (hasDuplicateImport(existingContent, memory.project.name)) {
    return replaceExistingImport(existingContent, memory.project.name, newSection);
  }

  return existingContent.trimEnd() + '\n\n' + newSection;
}

function buildWorkflowImportSection(memory: ContextMemory, timestamp: string): string {
  const lines: string[] = [];
  lines.push(`${IMPORT_MARKER_START} source="${memory.project.name}" time="${timestamp}" -->`);
  lines.push('');
  lines.push(`## Imported from: ${memory.project.name}`);
  lines.push('');
  lines.push(`> Captured: ${memory.project.capturedAt}`);
  lines.push(`> Imported: ${timestamp}`);
  lines.push('');

  if (memory.project.languages.length > 0) {
    lines.push(`**Languages:** ${memory.project.languages.join(', ')}`);
  }
  if (memory.project.frameworks.length > 0) {
    lines.push(`**Frameworks:** ${memory.project.frameworks.join(', ')}`);
  }
  lines.push('');

  if (memory.workflows.length > 0) {
    lines.push('### Workflows');
    lines.push('');
    for (const wf of memory.workflows) {
      lines.push(`#### ${wf.name}`);
      lines.push('');
      lines.push(wf.description);
      lines.push('');
      if (wf.steps.length > 0) {
        lines.push('**Steps:**');
        for (const step of wf.steps) {
          lines.push(`1. ${step}`);
        }
        lines.push('');
      }
      if (wf.services.length > 0) {
        lines.push(`**Services:** ${wf.services.join(', ')}`);
        lines.push('');
      }
    }
  }

  if (memory.endpoints.length > 0) {
    lines.push('### Endpoints');
    lines.push('');
    for (const ep of memory.endpoints) {
      const method = ep.method ? `${ep.method} ` : '';
      lines.push(`- \`${method}${ep.path}\` - ${ep.description}`);
    }
    lines.push('');
  }

  if (memory.serviceBoundaries.length > 0) {
    lines.push('### Service Boundaries');
    lines.push('');
    for (const sb of memory.serviceBoundaries) {
      lines.push(`- **${sb.name}**: ${sb.description || 'No description'}`);
      if (sb.dependencies.length > 0) {
        lines.push(`  - Dependencies: ${sb.dependencies.join(', ')}`);
      }
    }
    lines.push('');
  }

  if (memory.envKeys.length > 0) {
    lines.push('### Environment Variables');
    lines.push('');
    for (const env of memory.envKeys) {
      lines.push(`- \`${env.key}\` (from ${env.source})`);
    }
    lines.push('');
  }

  lines.push(IMPORT_MARKER_END);

  return lines.join('\n');
}

export function hasDuplicateImport(content: string, projectName: string): boolean {
  return content.includes(`source="${projectName}"`) || content.includes(`source: ${projectName},`);
}

function replaceExistingImport(content: string, projectName: string, newSection: string): string {
  const markerPattern = new RegExp(
    `${escapeRegex(IMPORT_MARKER_START)}[^>]*source="${escapeRegex(projectName)}"[^>]*-->` +
      '[\\s\\S]*?' +
      escapeRegex(IMPORT_MARKER_END),
    'g',
  );

  if (markerPattern.test(content)) {
    return content.replace(markerPattern, newSection);
  }

  const mdcPattern = new RegExp(
    escapeRegex(MDC_IMPORT_MARKER) +
      `\\s+${escapeRegex(projectName)}@[\\s\\S]*?(?=\\n${escapeRegex(MDC_IMPORT_MARKER)}|$)`,
    'g',
  );

  if (mdcPattern.test(content)) {
    return content.replace(mdcPattern, newSection);
  }

  return content.trimEnd() + '\n\n' + newSection;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
