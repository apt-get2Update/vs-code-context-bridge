import * as vscode from 'vscode';
import { extractContext } from '../core/extractor';
import { ContextStoreManager } from '../storage/store';
import { log, showInfo, showError } from '../utils/logger';

export async function captureContext(store: ContextStoreManager): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    showError('No workspace folder is open. Open a project folder first.');
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const config = vscode.workspace.getConfiguration('contextBridge');
  const captureReadme = config.get<boolean>('captureReadme', true);
  const captureAgentsMd = config.get<boolean>('captureAgentsMd', true);

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Context Bridge: Capturing project context...',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 10, message: 'Scanning project files...' });

        const memory = await extractContext(rootPath, {
          captureReadme,
          captureAgentsMd,
        });

        progress.report({ increment: 60, message: 'Saving to context store...' });

        await store.addMemory(memory);

        progress.report({ increment: 30, message: 'Done!' });

        const stats = [
          `${memory.cursorRules.length} rules`,
          `${memory.workflows.length} workflows`,
          `${memory.endpoints.length} endpoints`,
          `${memory.envKeys.length} env keys`,
        ].join(', ');

        log(`Captured context for "${memory.project.name}": ${stats}`);
        showInfo(`Context captured for "${memory.project.name}": ${stats}`);
      },
    );
  } catch (error) {
    showError(
      `Failed to capture context: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
