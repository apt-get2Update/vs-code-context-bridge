const SECRET_PATTERNS: RegExp[] = [
  /(?:password|passwd|pwd)\s*[=:]\s*\S+/gi,
  /(?:secret|token|api[_-]?key|auth[_-]?token)\s*[=:]\s*\S+/gi,
  /(?:access[_-]?key|private[_-]?key)\s*[=:]\s*\S+/gi,
  /(?:bearer\s+)\S+/gi,
  /(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9_]{36,}/g,
  /(?:sk-|pk-)[A-Za-z0-9]{32,}/g,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
];

const REDACTED = '[REDACTED]';

export function redactSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    const fresh = new RegExp(pattern.source, pattern.flags);
    result = result.replace(fresh, REDACTED);
  }
  return result;
}

export function containsSecret(text: string): boolean {
  return SECRET_PATTERNS.some((pattern) => {
    const fresh = new RegExp(pattern.source, pattern.flags);
    return fresh.test(text);
  });
}

export function redactEnvValue(line: string): string {
  const eqIndex = line.indexOf('=');
  if (eqIndex === -1) {
    return line;
  }
  const key = line.substring(0, eqIndex);
  return `${key}=${REDACTED}`;
}
