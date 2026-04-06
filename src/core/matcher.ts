import * as path from 'path';
import { ContextMemory } from '../types/context';
import { ContextSuggestion, SuggestionReason, MatchScoreBreakdown } from '../types/suggestion';
import { readFileSafe, findFiles } from '../utils/fs';

const WEIGHTS = {
  keyword: 0.25,
  fileSignature: 0.2,
  framework: 0.25,
  endpoint: 0.15,
  workflow: 0.15,
};

export async function findSuggestions(
  rootPath: string,
  memories: ContextMemory[],
  maxResults: number,
  minimumConfidence: number,
): Promise<ContextSuggestion[]> {
  const localMeta = await getLocalProjectSignature(rootPath);

  const scored: ContextSuggestion[] = [];

  for (const memory of memories) {
    if (memory.project.rootPath === rootPath) {
      continue;
    }
    const breakdown = scoreMemory(memory, localMeta);
    if (breakdown.totalScore >= minimumConfidence) {
      scored.push({
        memory,
        confidence: Math.round(breakdown.totalScore * 100) / 100,
        reasons: buildReasons(breakdown),
      });
    }
  }

  scored.sort((a, b) => b.confidence - a.confidence);
  return scored.slice(0, maxResults);
}

interface LocalProjectSignature {
  name: string;
  languages: string[];
  frameworks: string[];
  fileNames: string[];
  keywords: Set<string>;
  endpoints: string[];
}

async function getLocalProjectSignature(rootPath: string): Promise<LocalProjectSignature> {
  const name = path.basename(rootPath);
  const sig: LocalProjectSignature = {
    name,
    languages: [],
    frameworks: [],
    fileNames: [],
    keywords: new Set(),
    endpoints: [],
  };

  const packageJson = await readFileSafe(path.join(rootPath, 'package.json'));
  if (packageJson) {
    sig.languages.push('TypeScript', 'JavaScript');
    try {
      const pkg = JSON.parse(packageJson) as Record<string, unknown>;
      const deps = {
        ...(pkg.dependencies as Record<string, string> | undefined),
        ...(pkg.devDependencies as Record<string, string> | undefined),
      };
      Object.keys(deps).forEach((d) => sig.keywords.add(d));
      if (deps['react']) {
        sig.frameworks.push('React');
      }
      if (deps['next']) {
        sig.frameworks.push('Next.js');
      }
      if (deps['express']) {
        sig.frameworks.push('Express');
      }
      if (deps['@nestjs/core']) {
        sig.frameworks.push('NestJS');
      }
      if (deps['vue']) {
        sig.frameworks.push('Vue');
      }
      if (deps['@angular/core']) {
        sig.frameworks.push('Angular');
      }
    } catch {
      // skip
    }
  }

  try {
    const allFiles = await findFiles(rootPath, /\.(ts|js|py|go|rs|java|rb)$/);
    sig.fileNames = allFiles.map((f) => path.basename(f));
  } catch {
    // skip
  }

  const readme = await readFileSafe(path.join(rootPath, 'README.md'));
  if (readme) {
    extractKeywords(readme).forEach((k) => sig.keywords.add(k));
  }

  return sig;
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().split(/[\s,;:./\\()[\]{}|"'`]+/);
  return words.filter((w) => w.length > 3 && w.length < 30).filter((w) => !/^\d+$/.test(w));
}

export function scoreMemory(
  memory: ContextMemory,
  local: LocalProjectSignature,
): MatchScoreBreakdown {
  const keywordScore = computeKeywordOverlap(memory, local);
  const fileSignatureScore = computeFileSignatureOverlap(memory, local);
  const frameworkScore = computeFrameworkOverlap(memory, local);
  const endpointScore = computeEndpointOverlap(memory, local);
  const workflowScore = computeWorkflowOverlap(memory, local);

  const totalScore =
    keywordScore * WEIGHTS.keyword +
    fileSignatureScore * WEIGHTS.fileSignature +
    frameworkScore * WEIGHTS.framework +
    endpointScore * WEIGHTS.endpoint +
    workflowScore * WEIGHTS.workflow;

  return {
    keywordScore,
    fileSignatureScore,
    frameworkScore,
    endpointScore,
    workflowScore,
    totalScore,
  };
}

function computeKeywordOverlap(memory: ContextMemory, local: LocalProjectSignature): number {
  const memoryKeywords = new Set<string>();
  for (const section of memory.rawSections) {
    extractKeywords(section.content).forEach((k) => memoryKeywords.add(k));
  }
  for (const rule of memory.cursorRules) {
    extractKeywords(rule.content).forEach((k) => memoryKeywords.add(k));
  }

  if (memoryKeywords.size === 0 || local.keywords.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const k of local.keywords) {
    if (memoryKeywords.has(k)) {
      overlap++;
    }
  }

  const maxPossible = Math.min(memoryKeywords.size, local.keywords.size);
  return maxPossible > 0 ? Math.min(overlap / maxPossible, 1) : 0;
}

function computeFileSignatureOverlap(memory: ContextMemory, local: LocalProjectSignature): number {
  const memoryFiles = new Set<string>();
  for (const pat of memory.architecturePatterns) {
    for (const f of pat.files) {
      memoryFiles.add(path.basename(f));
    }
  }
  for (const rule of memory.cursorRules) {
    memoryFiles.add(path.basename(rule.filePath));
  }

  if (memoryFiles.size === 0 || local.fileNames.length === 0) {
    return 0;
  }

  const localFileSet = new Set(local.fileNames);
  let overlap = 0;
  for (const f of memoryFiles) {
    if (localFileSet.has(f)) {
      overlap++;
    }
  }

  const maxPossible = Math.min(memoryFiles.size, localFileSet.size);
  return maxPossible > 0 ? Math.min(overlap / maxPossible, 1) : 0;
}

function computeFrameworkOverlap(memory: ContextMemory, local: LocalProjectSignature): number {
  const memFw = new Set(memory.project.frameworks.map((f) => f.toLowerCase()));
  const localFw = new Set(local.frameworks.map((f) => f.toLowerCase()));

  if (memFw.size === 0 || localFw.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const f of localFw) {
    if (memFw.has(f)) {
      overlap++;
    }
  }

  return overlap / Math.max(memFw.size, localFw.size);
}

function computeEndpointOverlap(memory: ContextMemory, local: LocalProjectSignature): number {
  if (memory.endpoints.length === 0) {
    return 0;
  }

  const endpointKeywords = new Set<string>();
  for (const ep of memory.endpoints) {
    const parts = ep.path.split('/').filter(Boolean);
    parts.forEach((p) => {
      if (!p.startsWith('{')) {
        endpointKeywords.add(p.toLowerCase());
      }
    });
  }

  let overlap = 0;
  for (const k of local.keywords) {
    if (endpointKeywords.has(k)) {
      overlap++;
    }
  }

  return endpointKeywords.size > 0 ? Math.min(overlap / endpointKeywords.size, 1) : 0;
}

function computeWorkflowOverlap(memory: ContextMemory, local: LocalProjectSignature): number {
  if (memory.workflows.length === 0) {
    return 0;
  }

  const wfKeywords = new Set<string>();
  for (const wf of memory.workflows) {
    extractKeywords(wf.name).forEach((k) => wfKeywords.add(k));
    extractKeywords(wf.description).forEach((k) => wfKeywords.add(k));
  }

  let overlap = 0;
  for (const k of local.keywords) {
    if (wfKeywords.has(k)) {
      overlap++;
    }
  }

  return wfKeywords.size > 0 ? Math.min(overlap / wfKeywords.size, 1) : 0;
}

function buildReasons(breakdown: MatchScoreBreakdown): SuggestionReason[] {
  const reasons: SuggestionReason[] = [];

  if (breakdown.keywordScore > 0) {
    reasons.push({
      type: 'keyword',
      description: `Keyword overlap score: ${(breakdown.keywordScore * 100).toFixed(0)}%`,
      weight: breakdown.keywordScore * WEIGHTS.keyword,
    });
  }
  if (breakdown.fileSignatureScore > 0) {
    reasons.push({
      type: 'file-signature',
      description: `File signature overlap: ${(breakdown.fileSignatureScore * 100).toFixed(0)}%`,
      weight: breakdown.fileSignatureScore * WEIGHTS.fileSignature,
    });
  }
  if (breakdown.frameworkScore > 0) {
    reasons.push({
      type: 'framework',
      description: `Framework match: ${(breakdown.frameworkScore * 100).toFixed(0)}%`,
      weight: breakdown.frameworkScore * WEIGHTS.framework,
    });
  }
  if (breakdown.endpointScore > 0) {
    reasons.push({
      type: 'endpoint',
      description: `Endpoint similarity: ${(breakdown.endpointScore * 100).toFixed(0)}%`,
      weight: breakdown.endpointScore * WEIGHTS.endpoint,
    });
  }
  if (breakdown.workflowScore > 0) {
    reasons.push({
      type: 'workflow',
      description: `Workflow similarity: ${(breakdown.workflowScore * 100).toFixed(0)}%`,
      weight: breakdown.workflowScore * WEIGHTS.workflow,
    });
  }

  return reasons;
}
