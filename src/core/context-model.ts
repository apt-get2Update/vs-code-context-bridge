import * as crypto from 'crypto';
import { ContextMemory, ProjectMetadata } from '../types/context';

export function createContextMemory(project: ProjectMetadata): ContextMemory {
  return {
    id: generateId(project.name),
    project,
    architecturePatterns: [],
    endpoints: [],
    workflows: [],
    serviceBoundaries: [],
    envKeys: [],
    mappingRules: [],
    cursorRules: [],
    rawSections: [],
  };
}

function generateId(seed: string): string {
  const timestamp = Date.now().toString();
  return crypto.createHash('sha256').update(`${seed}-${timestamp}`).digest('hex').substring(0, 16);
}

export function mergeContextMemories(
  existing: ContextMemory,
  incoming: ContextMemory,
): ContextMemory {
  return {
    ...existing,
    project: {
      ...existing.project,
      languages: dedupe([...existing.project.languages, ...incoming.project.languages]),
      frameworks: dedupe([...existing.project.frameworks, ...incoming.project.frameworks]),
      runtimeHints: dedupe([...existing.project.runtimeHints, ...incoming.project.runtimeHints]),
      capturedAt: incoming.project.capturedAt,
    },
    architecturePatterns: dedupeByName(
      existing.architecturePatterns,
      incoming.architecturePatterns,
    ),
    endpoints: dedupeByPath(existing.endpoints, incoming.endpoints),
    workflows: dedupeByName(existing.workflows, incoming.workflows),
    serviceBoundaries: dedupeByName(existing.serviceBoundaries, incoming.serviceBoundaries),
    envKeys: dedupeByKey(existing.envKeys, incoming.envKeys),
    mappingRules: dedupeByName(existing.mappingRules, incoming.mappingRules),
    cursorRules: dedupeByFilePath(existing.cursorRules, incoming.cursorRules),
    rawSections: dedupeByHeading(existing.rawSections, incoming.rawSections),
  };
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}

function dedupeByName<T extends { name: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of existing) {
    map.set(item.name, item);
  }
  for (const item of incoming) {
    map.set(item.name, item);
  }
  return Array.from(map.values());
}

function dedupeByPath<T extends { path: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of existing) {
    map.set(item.path, item);
  }
  for (const item of incoming) {
    map.set(item.path, item);
  }
  return Array.from(map.values());
}

function dedupeByKey<T extends { key: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of existing) {
    map.set(item.key, item);
  }
  for (const item of incoming) {
    map.set(item.key, item);
  }
  return Array.from(map.values());
}

function dedupeByFilePath<T extends { filePath: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of existing) {
    map.set(item.filePath, item);
  }
  for (const item of incoming) {
    map.set(item.filePath, item);
  }
  return Array.from(map.values());
}

function dedupeByHeading<T extends { heading: string; source: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const map = new Map<string, T>();
  for (const item of existing) {
    map.set(`${item.source}::${item.heading}`, item);
  }
  for (const item of incoming) {
    map.set(`${item.source}::${item.heading}`, item);
  }
  return Array.from(map.values());
}
