import type * as vscode from "vscode";

export interface BridgeSelection {
  text: string;
  isEmpty: boolean;
  filePath: string;
  fileUri: string;
  languageId: string;
  start: { line: number; character: number };
  end: { line: number; character: number };
}

export interface BridgeSelectionStatus {
  isEmpty: boolean;
  filePath: string;
  fileUri: string;
  languageId: string;
  start: { line: number; character: number };
  end: { line: number; character: number };
  selectedLineCount: number;
  selectedCharacterCount?: number;
}

export interface BridgeDiagnosticSummary {
  errors: number;
  warnings: number;
  infos: number;
  hints: number;
}

export interface BridgeEditorInfo {
  filePath: string;
  fileUri: string;
  languageId: string;
  isDirty: boolean;
  viewColumn?: vscode.ViewColumn;
  isActive: boolean;
}

export interface BridgeContext {
  server: import("node:http").Server;
  url: string;
  token: string;
  dispose(): Promise<void>;
}

export interface RpcRequest {
  method?: string;
  params?: Record<string, unknown>;
}

export interface BridgeState {
  latestSelection: BridgeSelection | undefined;
  reportTerminalSession(terminalId: string, sessionFile: string): void;
}
