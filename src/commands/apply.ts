import * as vscode from 'vscode';
import { previewApply, applyContext } from '../core/applier';
import { validateContextFiles } from '../core/validator';
import { ContextStoreManager } from '../storage/store';
import { getLastSuggestions } from './suggest';
import { log, showInfo, showError, showWarning } from '../utils/logger';
import { ContextMemory } from '../types/context';

export async function applyContextCommand(store: ContextStoreManager): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    showError('No workspace folder is open.');
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;

  try {
    const memory = await selectMemoryToApply(store);
    if (!memory) {
      return;
    }

    const preview = await previewApply(rootPath, memory);

    const mdcDoc = await vscode.workspace.openTextDocument({
      content: preview.mdcContent,
      language: 'markdown',
    });
    await vscode.window.showTextDocument(mdcDoc, {
      preview: true,
      viewColumn: vscode.ViewColumn.One,
    });

    const confirm = await vscode.window.showInformationMessage(
      `Apply context from "${memory.project.name}"?\n` +
        `Will ${preview.isUpdate ? 'update' : 'create'}: ` +
        `.cursor/rules/context-bridge-imported.mdc and docs/context-bridge-imported-workflows.md`,
      { modal: true },
      'Apply',
      'Cancel',
    );

    if (confirm !== 'Apply') {
      showInfo('Apply cancelled.');
      return;
    }

    const result = await applyContext(rootPath, memory);
    log(`Applied context from "${memory.project.name}": ${result.filesWritten} files written`);
    showInfo(
      `Context applied from "${memory.project.name}". ` + `${result.filesWritten} files written.`,
    );

    const config = vscode.workspace.getConfiguration('contextBridge');
    if (config.get<boolean>('autoValidate', true)) {
      const validationResults = await validateContextFiles(rootPath);
      const errors = validationResults.filter((r) => r.severity === 'error');
      if (errors.length > 0) {
        showWarning(
          `Context applied with ${errors.length} validation issue(s). ` +
            `Run "Validate Context Files" for details.`,
        );
      }
    }
  } catch (error) {
    showError(`Failed to apply context: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function selectMemoryToApply(store: ContextStoreManager): Promise<ContextMemory | null> {
  const lastSuggestions = getLastSuggestions();

  if (lastSuggestions.length > 0) {
    const items = lastSuggestions.map((s) => ({
      label: s.memory.project.name,
      description: `Confidence: ${(s.confidence * 100).toFixed(0)}%`,
      memory: s.memory,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select context to apply',
      title: 'Apply Context',
    });

    return selected?.memory ?? null;
  }

  const memories = await store.getMemories();
  if (memories.length === 0) {
    showWarning('No stored context available. Capture a project first.');
    return null;
  }

  const items = memories.map((m) => ({
    label: m.project.name,
    description: `Captured: ${m.project.capturedAt}`,
    detail: `Languages: ${m.project.languages.join(', ')} | Frameworks: ${m.project.frameworks.join(', ')}`,
    memory: m,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select context to apply',
    title: 'Apply Context',
  });

  return selected?.memory ?? null;
}
