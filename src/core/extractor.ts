import * as path from 'path';
import {
  ContextMemory,
  CursorRule,
  ProjectMetadata,
  RawSection,
  WorkflowSummary,
  EndpointSummary,
  EnvKeyReference,
  ArchitecturePattern,
  ServiceBoundary,
  MappingRule,
} from '../types/context';
import { createContextMemory } from './context-model';
import { readFileSafe, findFiles } from '../utils/fs';
import { toRelativePath } from '../utils/platform';
import { redactSecrets } from '../utils/redaction';

export async function extractContext(
  rootPath: string,
  options: ExtractOptions,
): Promise<ContextMemory> {
  const projectName = path.basename(rootPath);
  const metadata = await detectProjectMetadata(rootPath, projectName);
  const memory = createContextMemory(metadata);

  const cursorRulesDir = path.join(rootPath, '.cursor', 'rules');
  const mdcFiles = await findFiles(cursorRulesDir, /\.mdc$/);
  for (const file of mdcFiles) {
    const rule = await parseMdcFile(file, rootPath);
    if (rule) {
      memory.cursorRules.push(rule);
    }
  }

  const docsDir = path.join(rootPath, 'docs');
  const workflowFiles = await findFiles(docsDir, /workflow/i);
  for (const file of workflowFiles) {
    const sections = await parseWorkflowDoc(file, rootPath);
    memory.rawSections.push(...sections);
    memory.workflows.push(...extractWorkflowsFromSections(sections));
  }

  if (options.captureReadme) {
    const readmePath = path.join(rootPath, 'README.md');
    const sections = await parseMarkdownFile(readmePath, rootPath);
    memory.rawSections.push(...sections);
    memory.endpoints.push(...extractEndpointsFromSections(sections));
    memory.architecturePatterns.push(...extractArchitecturePatternsFromSections(sections));
  }

  if (options.captureAgentsMd) {
    const agentsPath = path.join(rootPath, 'AGENTS.md');
    const sections = await parseMarkdownFile(agentsPath, rootPath);
    memory.rawSections.push(...sections);
  }

  memory.envKeys.push(...(await extractEnvKeys(rootPath)));
  memory.serviceBoundaries.push(...extractServiceBoundaries(memory));
  memory.mappingRules.push(...extractMappingRules(memory.rawSections));

  return memory;
}

export interface ExtractOptions {
  captureReadme: boolean;
  captureAgentsMd: boolean;
}

async function detectProjectMetadata(
  rootPath: string,
  projectName: string,
): Promise<ProjectMetadata> {
  const metadata: ProjectMetadata = {
    name: projectName,
    languages: [],
    frameworks: [],
    runtimeHints: [],
    rootPath,
    capturedAt: new Date().toISOString(),
  };

  const packageJson = await readFileSafe(path.join(rootPath, 'package.json'));
  if (packageJson) {
    metadata.languages.push('TypeScript', 'JavaScript');
    try {
      const pkg = JSON.parse(packageJson) as Record<string, unknown>;
      const deps = {
        ...(pkg.dependencies as Record<string, string> | undefined),
        ...(pkg.devDependencies as Record<string, string> | undefined),
      };
      if (deps['react']) {
        metadata.frameworks.push('React');
      }
      if (deps['next']) {
        metadata.frameworks.push('Next.js');
      }
      if (deps['express']) {
        metadata.frameworks.push('Express');
      }
      if (deps['@nestjs/core']) {
        metadata.frameworks.push('NestJS');
      }
      if (deps['vue']) {
        metadata.frameworks.push('Vue');
      }
      if (deps['@angular/core']) {
        metadata.frameworks.push('Angular');
      }
      if (deps['fastify']) {
        metadata.frameworks.push('Fastify');
      }
      const engines = pkg.engines as Record<string, string> | undefined;
      if (engines?.node) {
        metadata.runtimeHints.push(`Node.js ${engines.node}`);
      }
    } catch {
      // malformed package.json - continue
    }
  }

  const reqTxt = await readFileSafe(path.join(rootPath, 'requirements.txt'));
  const pyProject = await readFileSafe(path.join(rootPath, 'pyproject.toml'));
  if (reqTxt || pyProject) {
    metadata.languages.push('Python');
    if (reqTxt?.includes('django')) {
      metadata.frameworks.push('Django');
    }
    if (reqTxt?.includes('flask')) {
      metadata.frameworks.push('Flask');
    }
    if (reqTxt?.includes('fastapi')) {
      metadata.frameworks.push('FastAPI');
    }
  }

  const goMod = await readFileSafe(path.join(rootPath, 'go.mod'));
  if (goMod) {
    metadata.languages.push('Go');
    if (goMod.includes('gin-gonic')) {
      metadata.frameworks.push('Gin');
    }
  }

  const cargoToml = await readFileSafe(path.join(rootPath, 'Cargo.toml'));
  if (cargoToml) {
    metadata.languages.push('Rust');
    if (cargoToml.includes('actix')) {
      metadata.frameworks.push('Actix');
    }
  }

  return metadata;
}

export async function parseMdcFile(filePath: string, rootPath: string): Promise<CursorRule | null> {
  const content = await readFileSafe(filePath);
  if (!content) {
    return null;
  }

  const relPath = toRelativePath(filePath, rootPath);
  const { frontmatter, body } = parseFrontmatter(content);

  return {
    filePath: relPath,
    description: (frontmatter['description'] as string) ?? '',
    alwaysApply: frontmatter['alwaysApply'] === true,
    globs: parseGlobs(frontmatter['globs']),
    content: redactSecrets(body),
  };
}

export function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = fmRegex.exec(content);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const rawFm = match[1];
  const body = match[2];
  const frontmatter: Record<string, unknown> = {};

  for (const line of rawFm.split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      continue;
    }
    const key = line.substring(0, colonIdx).trim();
    let value: unknown = line.substring(colonIdx + 1).trim();

    if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    } else if (typeof value === 'string' && /^\d+$/.test(value)) {
      value = parseInt(value, 10);
    }

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

function parseGlobs(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return [];
}

async function parseWorkflowDoc(filePath: string, rootPath: string): Promise<RawSection[]> {
  return parseMarkdownFile(filePath, rootPath);
}

async function parseMarkdownFile(filePath: string, rootPath: string): Promise<RawSection[]> {
  const content = await readFileSafe(filePath);
  if (!content) {
    return [];
  }

  const relPath = toRelativePath(filePath, rootPath);
  return splitMarkdownIntoSections(redactSecrets(content), relPath);
}

export function splitMarkdownIntoSections(content: string, source: string): RawSection[] {
  const sections: RawSection[] = [];
  const lines = content.split(/\r?\n/);
  let currentHeading = 'Introduction';
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = /^(#{1,4})\s+(.+)/.exec(line);
    if (headingMatch) {
      if (currentLines.length > 0) {
        sections.push({
          source,
          heading: currentHeading,
          content: currentLines.join('\n').trim(),
        });
      }
      currentHeading = headingMatch[2];
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    sections.push({
      source,
      heading: currentHeading,
      content: currentLines.join('\n').trim(),
    });
  }

  return sections.filter((s) => s.content.length > 0);
}

function extractWorkflowsFromSections(sections: RawSection[]): WorkflowSummary[] {
  const workflows: WorkflowSummary[] = [];

  for (const section of sections) {
    if (/workflow|flow|process|pipeline/i.test(section.heading)) {
      const steps = extractListItems(section.content);
      const services = extractServiceMentions(section.content);
      workflows.push({
        name: section.heading,
        description: section.content.substring(0, 200),
        steps,
        services,
      });
    }
  }

  return workflows;
}

function extractEndpointsFromSections(sections: RawSection[]): EndpointSummary[] {
  const endpoints: EndpointSummary[] = [];
  const endpointRegex = /\b(GET|POST|PUT|PATCH|DELETE)\s+([/\w{}\-.:]+)/g;

  for (const section of sections) {
    let match: RegExpExecArray | null;
    while ((match = endpointRegex.exec(section.content)) !== null) {
      endpoints.push({
        method: match[1],
        path: match[2],
        description: section.heading,
      });
    }
  }

  return endpoints;
}

function extractArchitecturePatternsFromSections(sections: RawSection[]): ArchitecturePattern[] {
  const patterns: ArchitecturePattern[] = [];
  const patternKeywords = [
    'architecture',
    'pattern',
    'structure',
    'layer',
    'module',
    'component',
    'service',
    'microservice',
    'monolith',
    'mvc',
    'mvvm',
  ];

  for (const section of sections) {
    const lowerHeading = section.heading.toLowerCase();
    if (patternKeywords.some((kw) => lowerHeading.includes(kw))) {
      patterns.push({
        name: section.heading,
        description: section.content.substring(0, 300),
        files: [],
      });
    }
  }

  return patterns;
}

async function extractEnvKeys(rootPath: string): Promise<EnvKeyReference[]> {
  const envFiles = ['.env.example', '.env.sample', '.env.template'];
  const keys: EnvKeyReference[] = [];

  for (const envFile of envFiles) {
    const content = await readFileSafe(path.join(rootPath, envFile));
    if (!content) {
      continue;
    }
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        keys.push({
          key,
          description: '',
          source: envFile,
        });
      }
    }
  }

  return keys;
}

function extractServiceBoundaries(memory: ContextMemory): ServiceBoundary[] {
  const serviceNames = new Set<string>();

  for (const wf of memory.workflows) {
    for (const svc of wf.services) {
      serviceNames.add(svc);
    }
  }

  for (const ep of memory.endpoints) {
    if (ep.service) {
      serviceNames.add(ep.service);
    }
  }

  return Array.from(serviceNames).map((name) => ({
    name,
    description: '',
    dependencies: [],
  }));
}

function extractMappingRules(sections: RawSection[]): MappingRule[] {
  const rules: MappingRule[] = [];

  for (const section of sections) {
    if (/mapping|transform|convert|create.*update|crud/i.test(section.heading)) {
      rules.push({
        name: section.heading,
        description: section.content.substring(0, 200),
        sourcePattern: '',
        targetPattern: '',
      });
    }
  }

  return rules;
}

function extractListItems(content: string): string[] {
  const items: string[] = [];
  const listRegex = /^[\s]*[-*\d.]+\s+(.+)/gm;
  let match: RegExpExecArray | null;
  while ((match = listRegex.exec(content)) !== null) {
    items.push(match[1].trim());
  }
  return items;
}

function extractServiceMentions(content: string): string[] {
  const serviceRegex = /\b(\w+[-]?(?:service|api|server|worker|queue|db|database))\b/gi;
  const services = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = serviceRegex.exec(content)) !== null) {
    services.add(match[1].toLowerCase());
  }
  return Array.from(services);
}
