import * as os from 'os';
import * as path from 'path';

export function getDefaultStorePath(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.context-bridge', 'store.json');
}

export function getDefaultStoreDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.context-bridge');
}

export function isWindows(): boolean {
  return os.platform() === 'win32';
}

export function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

export function toRelativePath(filePath: string, rootPath: string): string {
  const rel = path.relative(rootPath, filePath);
  return normalizePath(rel);
}

export function ensurePosixSeparators(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}
