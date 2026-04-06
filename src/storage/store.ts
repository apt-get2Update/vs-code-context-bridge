import * as vscode from 'vscode';
import { ContextStore } from '../types/store';
import { ContextMemory } from '../types/context';
import { mergeContextMemories } from '../core/context-model';
import { readFileSafe, writeFileSafe } from '../utils/fs';
import { getDefaultStorePath } from '../utils/platform';
import { migrateStore, createEmptyStore, needsMigration } from './migrations';

export class ContextStoreManager {
  private storePath: string;
  private cache: ContextStore | null = null;

  constructor(customPath?: string) {
    this.storePath = customPath || this.getConfiguredPath();
  }

  private getConfiguredPath(): string {
    const config = vscode.workspace.getConfiguration('contextBridge');
    const customPath = config.get<string>('storePath');
    return customPath && customPath.trim() !== '' ? customPath : getDefaultStorePath();
  }

  async load(): Promise<ContextStore> {
    if (this.cache) {
      return this.cache;
    }

    const raw = await readFileSafe(this.storePath);
    if (!raw) {
      this.cache = createEmptyStore();
      return this.cache;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (needsMigration(parsed)) {
        this.cache = migrateStore(parsed);
        await this.save();
      } else {
        this.cache = parsed as ContextStore;
      }
    } catch {
      this.cache = createEmptyStore();
    }

    return this.cache;
  }

  async save(): Promise<void> {
    if (!this.cache) {
      return;
    }
    this.cache.lastUpdated = new Date().toISOString();
    const json = JSON.stringify(this.cache, null, 2);
    await writeFileSafe(this.storePath, json);
  }

  async addMemory(memory: ContextMemory): Promise<void> {
    const store = await this.load();

    const existingIdx = store.memories.findIndex((m) => m.project.name === memory.project.name);

    if (existingIdx >= 0) {
      store.memories[existingIdx] = mergeContextMemories(store.memories[existingIdx], memory);
    } else {
      store.memories.push(memory);
    }

    await this.save();
  }

  async getMemories(): Promise<ContextMemory[]> {
    const store = await this.load();
    return store.memories;
  }

  async removeMemory(projectName: string): Promise<boolean> {
    const store = await this.load();
    const idx = store.memories.findIndex((m) => m.project.name === projectName);
    if (idx >= 0) {
      store.memories.splice(idx, 1);
      await this.save();
      return true;
    }
    return false;
  }

  getStorePath(): string {
    return this.storePath;
  }

  invalidateCache(): void {
    this.cache = null;
  }
}
