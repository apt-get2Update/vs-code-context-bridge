import * as vscode from 'vscode';
import { ContextStoreManager } from '../storage/store';
import { showError, log } from '../utils/logger';
import { fileExists } from '../utils/fs';

export async function openStore(store: ContextStoreManager): Promise<void> {
  const storePath = store.getStorePath();

  try {
    const exists = await fileExists(storePath);

    if (!exists) {
      const create = await vscode.window.showInformationMessage(
        'Context store does not exist yet. Create it?',
        'Create',
        'Cancel',
      );

      if (create === 'Create') {
        await store.load();
        await store.save();
        log(`Created context store at ${storePath}`);
      } else {
        return;
      }
    }

    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(storePath));
    await vscode.window.showTextDocument(doc);
    log(`Opened context store: ${storePath}`);
  } catch (error) {
    showError(
      `Failed to open context store: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
