export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationResult {
  file: string;
  severity: ValidationSeverity;
  message: string;
  line?: number;
}

export interface MdcFrontmatter {
  description?: string;
  alwaysApply?: boolean;
  globs?: string | string[];
  [key: string]: unknown;
}
