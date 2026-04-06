import * as vscode from 'vscode';
import { validateContextFiles } from '../core/validator';
import { log, showInfo, showError, getOutputChannel } from '../utils/logger';

export async function validateContext(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    showError('No workspace folder is open.');
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Context Bridge: Validating context files...',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 30, message: 'Scanning files...' });

        const results = await validateContextFiles(rootPath);

        progress.report({ increment: 70, message: 'Done!' });

        if (results.length === 0) {
          showInfo('All context files are valid.');
          return;
        }

        const channel = getOutputChannel();
        channel.clear();
        channel.appendLine('=== Context Bridge Validation Results ===');
        channel.appendLine('');

        const errors = results.filter((r) => r.severity === 'error');
        const warnings = results.filter((r) => r.severity === 'warning');
        const infos = results.filter((r) => r.severity === 'info');

        for (const result of results) {
          const icon =
            result.severity === 'error' ? '❌' : result.severity === 'warning' ? '⚠️' : 'ℹ️';
          const line = result.line ? `:${result.line}` : '';
          channel.appendLine(`${icon} [${result.severity.toUpperCase()}] ${result.file}${line}`);
          channel.appendLine(`   ${result.message}`);
          channel.appendLine('');
        }

        channel.appendLine(
          `Summary: ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info(s)`,
        );
        channel.show();

        log(
          `Validation complete: ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info(s)`,
        );

        if (errors.length > 0) {
          void vscode.window.showWarningMessage(
            `Context Bridge: Found ${errors.length} error(s) and ${warnings.length} warning(s). See Output panel for details.`,
          );
        } else if (warnings.length > 0) {
          showInfo(`Validation passed with ${warnings.length} warning(s). See Output panel.`);
        } else {
          showInfo('All context files are valid.');
        }
      },
    );
  } catch (error) {
    showError(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
