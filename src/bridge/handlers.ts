import * as vscode from "vscode";
import {
  captureSelection,
  captureSelectionStatus,
  getEditorInfo,
  getSelectionStatus,
  serializeDiagnostic,
  serializeHover,
  serializeLocation,
  serializeLocationLike,
  serializePosition,
  serializeSymbol,
} from "./serialize.ts";
import type { BridgeDiagnosticSummary, BridgeEditorInfo, BridgeState } from "./types.ts";
import {
  getFileUri,
  getWorkspaceFolders,
  readOptionalString,
  readRequiredPosition,
  readRequiredString,
} from "./utils.ts";

export async function handleRpc(
  method: string,
  params: Record<string, unknown>,
  state: BridgeState,
): Promise<unknown> {
  switch (method) {
    case "getEditorState": {
      const activeEditor = vscode.window.activeTextEditor;
      return {
        workspaceFolders: getWorkspaceFolders(),
        activeEditor: activeEditor ? getEditorInfo(activeEditor) : undefined,
        currentSelection: captureSelection(activeEditor),
        latestSelection: state.latestSelection,
        openEditors: getOpenEditors(),
      };
    }
    case "getStatus":
      return getStatus(state);
    case "getCurrentSelection":
      return captureSelection(vscode.window.activeTextEditor) ?? state.latestSelection;
    case "getDiagnostics":
      return getDiagnostics(readOptionalString(params.filePath));
    case "getWorkspaceFolders":
      return getWorkspaceFolders();
    case "getDocumentSymbols":
      return getDocumentSymbols(params);
    case "getDefinitions":
      return getDefinitions(params);
    case "getTypeDefinitions":
      return getTypeDefinitions(params);
    case "getImplementations":
      return getImplementations(params);
    case "getDeclarations":
      return getDeclarations(params);
    case "getHover":
      return getHover(params);
    case "getWorkspaceSymbols":
      return getWorkspaceSymbols(params);
    case "getReferences":
      return getReferences(params);
    case "reportTerminalSession":
      return reportTerminalSession(params, state);
    default:
      throw new Error(`Unknown bridge method: ${method}`);
  }
}

function reportTerminalSession(params: Record<string, unknown>, state: BridgeState) {
  const terminalId = readRequiredString(params.terminalId, "terminalId");
  const sessionFile = readRequiredString(params.sessionFile, "sessionFile");
  state.reportTerminalSession(terminalId, sessionFile);
  return { received: true };
}

function getStatus(state: BridgeState) {
  const activeEditor = vscode.window.activeTextEditor;
  const fallbackSelection = state.latestSelection;
  const fallbackUri = fallbackSelection ? vscode.Uri.parse(fallbackSelection.fileUri) : undefined;

  return {
    workspaceFolders: getWorkspaceFolders(),
    activeEditor: activeEditor
      ? getEditorInfo(activeEditor)
      : fallbackSelection
        ? getEditorInfoFromSelection(fallbackSelection)
        : undefined,
    selection: activeEditor
      ? captureSelectionStatus(activeEditor)
      : fallbackSelection
        ? getSelectionStatus(fallbackSelection)
        : undefined,
    diagnostics: activeEditor
      ? getDiagnosticSummary(vscode.languages.getDiagnostics(activeEditor.document.uri))
      : fallbackUri
        ? getDiagnosticSummary(vscode.languages.getDiagnostics(fallbackUri))
        : getDiagnosticSummary([]),
  };
}

function getEditorInfoFromSelection(selection: BridgeState["latestSelection"]): BridgeEditorInfo {
  const openDocument = vscode.workspace.textDocuments.find(
    (document) => document.uri.toString() === selection?.fileUri,
  );
  return {
    filePath: selection?.filePath ?? "",
    fileUri: selection?.fileUri ?? "",
    languageId: openDocument?.languageId ?? selection?.languageId ?? "",
    isDirty: openDocument?.isDirty ?? false,
    isActive: false,
  };
}

function getDiagnosticSummary(diagnostics: readonly vscode.Diagnostic[]): BridgeDiagnosticSummary {
  const summary = { errors: 0, warnings: 0, infos: 0, hints: 0 };
  for (const diagnostic of diagnostics) {
    switch (diagnostic.severity) {
      case vscode.DiagnosticSeverity.Error:
        summary.errors++;
        break;
      case vscode.DiagnosticSeverity.Warning:
        summary.warnings++;
        break;
      case vscode.DiagnosticSeverity.Information:
        summary.infos++;
        break;
      case vscode.DiagnosticSeverity.Hint:
        summary.hints++;
        break;
    }
  }
  return summary;
}

function getOpenEditors() {
  const seen = new Map<string, ReturnType<typeof getEditorInfo>>();
  for (const editor of vscode.window.visibleTextEditors) {
    if (editor.document.uri.scheme !== "file") continue;
    seen.set(editor.document.uri.toString(), getEditorInfo(editor));
  }
  for (const document of vscode.workspace.textDocuments) {
    if (document.uri.scheme !== "file") continue;
    if (seen.has(document.uri.toString())) continue;
    seen.set(document.uri.toString(), {
      filePath: document.uri.fsPath,
      fileUri: document.uri.toString(),
      languageId: document.languageId,
      isDirty: document.isDirty,
      isActive: vscode.window.activeTextEditor?.document.uri.toString() === document.uri.toString(),
    });
  }
  return [...seen.values()];
}

function getDiagnostics(filePath?: string) {
  const entries = filePath
    ? [[getFileUri(filePath), vscode.languages.getDiagnostics(getFileUri(filePath))] as const]
    : vscode.languages.getDiagnostics();

  return entries.map(([uri, diagnostics]) => ({
    filePath: uri.fsPath,
    fileUri: uri.toString(),
    diagnostics: diagnostics.map((diagnostic) => serializeDiagnostic(diagnostic)),
  }));
}

async function getDocumentSymbols(params: Record<string, unknown>) {
  const uri = getFileUri(readRequiredString(params.filePath, "filePath"));
  const result = await vscode.commands.executeCommand<
    vscode.DocumentSymbol[] | vscode.SymbolInformation[]
  >("vscode.executeDocumentSymbolProvider", uri);
  return {
    filePath: uri.fsPath,
    fileUri: uri.toString(),
    symbols: (result ?? []).map((symbol) => serializeSymbol(symbol)),
  };
}

async function getDefinitions(params: Record<string, unknown>) {
  return getLocationResults(params, "vscode.executeDefinitionProvider", "definitions");
}

async function getTypeDefinitions(params: Record<string, unknown>) {
  return getLocationResults(params, "vscode.executeTypeDefinitionProvider", "typeDefinitions");
}

async function getImplementations(params: Record<string, unknown>) {
  return getLocationResults(params, "vscode.executeImplementationProvider", "implementations");
}

async function getDeclarations(params: Record<string, unknown>) {
  return getLocationResults(params, "vscode.executeDeclarationProvider", "declarations");
}

async function getHover(params: Record<string, unknown>) {
  const filePath = readRequiredString(params.filePath, "filePath");
  const position = readRequiredPosition(params.position, "position");
  const uri = getFileUri(filePath);
  const result = await vscode.commands.executeCommand<vscode.Hover[]>(
    "vscode.executeHoverProvider",
    uri,
    position,
  );
  return {
    filePath: uri.fsPath,
    fileUri: uri.toString(),
    position: serializePosition(position),
    hovers: (result ?? []).map((hover) => serializeHover(hover)),
  };
}

async function getWorkspaceSymbols(params: Record<string, unknown>) {
  const query = readRequiredString(params.query, "query");
  const result = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
    "vscode.executeWorkspaceSymbolProvider",
    query,
  );
  return {
    query,
    symbols: (result ?? []).map((symbol) => serializeSymbol(symbol)),
  };
}

async function getReferences(params: Record<string, unknown>) {
  const filePath = readRequiredString(params.filePath, "filePath");
  const position = readRequiredPosition(params.position, "position");
  const uri = getFileUri(filePath);
  const result = await vscode.commands.executeCommand<vscode.Location[]>(
    "vscode.executeReferenceProvider",
    uri,
    position,
  );
  return {
    filePath: uri.fsPath,
    fileUri: uri.toString(),
    position: serializePosition(position),
    references: (result ?? []).map((location) => serializeLocation(location)),
  };
}

async function getLocationResults(
  params: Record<string, unknown>,
  command: string,
  resultKey: string,
) {
  const filePath = readRequiredString(params.filePath, "filePath");
  const position = readRequiredPosition(params.position, "position");
  const uri = getFileUri(filePath);
  const result = await vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>(
    command,
    uri,
    position,
  );
  return {
    filePath: uri.fsPath,
    fileUri: uri.toString(),
    position: serializePosition(position),
    [resultKey]: (result ?? []).map((location) => serializeLocationLike(location)),
  };
}
