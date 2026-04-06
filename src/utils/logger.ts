import * as vscode from 'vscode';
import { redactSecrets } from './redaction';

let outputChannel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Context Bridge');
  }
  return outputChannel;
}

export function log(message: string): void {
  const channel = getOutputChannel();
  const timestamp = new Date().toISOString();
  channel.appendLine(`[${timestamp}] ${redactSecrets(message)}`);
}

export function logError(message: string, error?: unknown): void {
  const channel = getOutputChannel();
  const timestamp = new Date().toISOString();
  const errMsg = error instanceof Error ? error.message : String(error ?? '');
  channel.appendLine(`[${timestamp}] ERROR: ${redactSecrets(message)} ${redactSecrets(errMsg)}`);
}

export function showInfo(message: string): void {
  void vscode.window.showInformationMessage(redactSecrets(message));
  log(message);
}

export function showWarning(message: string): void {
  void vscode.window.showWarningMessage(redactSecrets(message));
  log(`WARN: ${message}`);
}

export function showError(message: string): void {
  void vscode.window.showErrorMessage(redactSecrets(message));
  logError(message);
}

export function disposeChannel(): void {
  if (outputChannel) {
    outputChannel.dispose();
    outputChannel = undefined;
  }
}
