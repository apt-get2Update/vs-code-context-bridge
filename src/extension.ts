import * as vscode from 'vscode';
import { captureContext } from './commands/capture';
import { suggestContext } from './commands/suggest';
import { applyContextCommand } from './commands/apply';
import { openStore } from './commands/open-store';
import { validateContext } from './commands/validate';
import { ContextStoreManager } from './storage/store';
import { log, disposeChannel } from './utils/logger';

let store: ContextStoreManager;

export function activate(context: vscode.ExtensionContext): void {
  log('Context Bridge extension activating...');

  store = new ContextStoreManager();

  const commands: Array<{ id: string; handler: () => Promise<void> }> = [
    { id: 'contextBridge.captureContext', handler: () => captureContext(store) },
    { id: 'contextBridge.suggestContext', handler: () => suggestContext(store) },
    { id: 'contextBridge.applyContext', handler: () => applyContextCommand(store) },
    { id: 'contextBridge.openStore', handler: () => openStore(store) },
    { id: 'contextBridge.validateContext', handler: () => validateContext() },
  ];

  for (const cmd of commands) {
    const disposable = vscode.commands.registerCommand(cmd.id, cmd.handler);
    context.subscriptions.push(disposable);
  }

  log('Context Bridge extension activated successfully.');
}

export function deactivate(): void {
  log('Context Bridge extension deactivating...');
  disposeChannel();
}
