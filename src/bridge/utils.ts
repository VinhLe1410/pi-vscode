import { posix, win32 } from "node:path";
import * as vscode from "vscode";

export function getWorkspaceFolders() {
  return (vscode.workspace.workspaceFolders ?? []).map((folder, index) => ({
    index,
    name: folder.name,
    filePath: folder.uri.fsPath,
    uri: folder.uri.toString(),
  }));
}

export function getFileUri(filePath: string): vscode.Uri {
  return vscode.Uri.file(resolveFilePath(filePath));
}

export function resolveFilePath(filePath: string): string {
  if (isAbsolutePath(filePath)) return filePath;
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root)
    throw new Error(`Cannot resolve relative path without a workspace folder: ${filePath}`);
  const pathApi = root.includes("\\") ? win32 : posix;
  return pathApi.resolve(root, filePath);
}

export function isAbsolutePath(filePath: string): boolean {
  return posix.isAbsolute(filePath) || win32.isAbsolute(filePath);
}

export function readPosition(value: unknown): vscode.Position | undefined {
  if (!value || typeof value !== "object") return undefined;
  const line = readOptionalNumber((value as Record<string, unknown>).line);
  const character = readOptionalNumber((value as Record<string, unknown>).character);
  if (line === undefined || character === undefined) return undefined;
  return new vscode.Position(line, character);
}

export function readRequiredPosition(value: unknown, name: string): vscode.Position {
  const position = readPosition(value);
  if (!position) throw new Error(`Missing required position: ${name}`);
  return position;
}

export function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readRequiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`Missing required parameter: ${name}`);
  return value;
}

export function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
