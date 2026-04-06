export interface ProjectMetadata {
  name: string;
  languages: string[];
  frameworks: string[];
  runtimeHints: string[];
  rootPath: string;
  capturedAt: string;
}

export interface ArchitecturePattern {
  name: string;
  description: string;
  files: string[];
}

export interface EndpointSummary {
  method?: string;
  path: string;
  description: string;
  service?: string;
}

export interface WorkflowSummary {
  name: string;
  description: string;
  steps: string[];
  services: string[];
}

export interface ServiceBoundary {
  name: string;
  description: string;
  dependencies: string[];
}

export interface EnvKeyReference {
  key: string;
  description: string;
  source: string;
}

export interface MappingRule {
  name: string;
  description: string;
  sourcePattern: string;
  targetPattern: string;
}

export interface ContextMemory {
  id: string;
  project: ProjectMetadata;
  architecturePatterns: ArchitecturePattern[];
  endpoints: EndpointSummary[];
  workflows: WorkflowSummary[];
  serviceBoundaries: ServiceBoundary[];
  envKeys: EnvKeyReference[];
  mappingRules: MappingRule[];
  cursorRules: CursorRule[];
  rawSections: RawSection[];
}

export interface CursorRule {
  filePath: string;
  description: string;
  alwaysApply: boolean;
  globs: string[];
  content: string;
}

export interface RawSection {
  source: string;
  heading: string;
  content: string;
}
