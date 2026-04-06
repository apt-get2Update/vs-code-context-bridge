import * as vscode from 'vscode';
import { findSuggestions } from '../core/matcher';
import { ContextStoreManager } from '../storage/store';
import { ContextSuggestion } from '../types/suggestion';
import { log, showInfo, showWarning, showError } from '../utils/logger';

let lastSuggestions: ContextSuggestion[] = [];

export function getLastSuggestions(): ContextSuggestion[] {
  return lastSuggestions;
}

export async function suggestContext(store: ContextStoreManager): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    showError('No workspace folder is open. Open a project folder first.');
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const config = vscode.workspace.getConfiguration('contextBridge');
  const maxSuggestions = config.get<number>('maxSuggestions', 5);
  const minimumConfidence = config.get<number>('minimumConfidence', 0.3);

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Context Bridge: Finding relevant context...',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 20, message: 'Loading context store...' });
        const memories = await store.getMemories();

        if (memories.length === 0) {
          showWarning(
            'No context stored yet. Use "Capture Current Project Context" in another repo first.',
          );
          return;
        }

        progress.report({ increment: 50, message: 'Scoring relevance...' });
        const suggestions = await findSuggestions(
          rootPath,
          memories,
          maxSuggestions,
          minimumConfidence,
        );

        lastSuggestions = suggestions;

        progress.report({ increment: 30, message: 'Done!' });

        if (suggestions.length === 0) {
          showInfo(
            'No relevant context found above the confidence threshold. ' +
              'Try lowering contextBridge.minimumConfidence or capturing more projects.',
          );
          return;
        }

        log(`Found ${suggestions.length} context suggestion(s) for this repository.`);

        const items = suggestions.map((s, i) => ({
          label: `$(database) ${s.memory.project.name}`,
          description: `Confidence: ${(s.confidence * 100).toFixed(0)}%`,
          detail: s.reasons.map((r) => r.description).join(' | '),
          index: i,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select a context to preview or apply',
          title: 'Context Bridge Suggestions',
        });

        if (selected) {
          const suggestion = suggestions[selected.index];
          const action = await vscode.window.showInformationMessage(
            `Apply context from "${suggestion.memory.project.name}" (${(suggestion.confidence * 100).toFixed(0)}% match)?`,
            'Apply',
            'Cancel',
          );

          if (action === 'Apply') {
            await vscode.commands.executeCommand('contextBridge.applyContext');
          }
        }
      },
    );
  } catch (error) {
    showError(
      `Failed to suggest context: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
