# pi-vscode

Maintained fork of the minimal VS Code extension for [Pi Coding Agent](https://pi.dev/), updated for the `@earendil-works/pi-coding-agent` package.

## Features

- **Terminal-based** — Opens pi as an integrated terminal with full TUI/PTY support (terminal panel by default, configurable to editor area)
- **VS Code bridge** — Bundles a pi extension and local bridge so pi can query live editor state
- **Editor awareness** — pi can inspect the active editor, current/latest selection, open editors, workspace folders, and VS Code diagnostics (LSP / lint / type errors)
- **Live VS Code footer status** — pi's terminal UI shows the active VS Code file, cursor/selection, language, dirty marker, and diagnostic counts in its bottom status area
- **Status bar button** — PI button in the status bar for quick access
- **Open with file context** — Send current file path and line range (or cursor position) to pi, available from the editor title bar
- **Send selection** — Send selected text directly to the pi terminal
- **`@pi` chat participant** — Use `@pi` in VS Code Chat for streamed RPC-backed replies while keeping the terminal workflow for normal Pi sessions
- **Package manager** — Browse, search, install, and uninstall pi packages from the sidebar with live output streaming and cancel support; automatically detects package capabilities (extensions, skills, prompts, themes)
- **Auto-detection** — Finds the pi binary automatically from common paths (`~/.bun/bin`, `~/.local/bin`, `~/.npm-global/bin`)

<img width="945" height="725" alt="image" src="https://github.com/user-attachments/assets/91dbaca4-6d27-490a-8395-94a9c4d07625" />

## Requirements

- `pi` CLI installed (`npm install --global @earendil-works/pi-coding-agent` or `bun install --global @earendil-works/pi-coding-agent`)
- An API key configured for at least one provider

## Install

This fork can be installed from a locally packaged VSIX until it is published:

```bash
pnpm package
code --install-extension pi-vscode-*.vsix
```

## Commands

| Command                       | Keybinding       | Description                                                                              |
| ----------------------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `Pi: Open`                    | `Ctrl+Alt+3`     | Open or focus the pi terminal using `pi-vscode.terminalLocation`                         |
| `Pi: Open in Terminal Panel`  | —                | Open pi in the terminal panel, regardless of the configured default                      |
| `Pi: Open with File`          | Editor title bar | Open pi with current file context                                                        |
| `Pi: Send Selection`          | —                | Send selected text to pi terminal                                                        |
| `Pi: Upgrade Pi and Packages` | —                | Find the pi binary, infer its package manager, upgrade pi globally, then run `pi update` |

## Sidebar

The **Pi** activity bar icon opens a sidebar with:

- **Packages view** — Search the npm registry for `pi-package` packages, see capability labels (extensions, skills, prompts, themes), install/uninstall with live streamed output, cancel in-progress operations, and use **Upgrade Pi and Packages** to upgrade the pi CLI plus installed pi packages from the sidebar

## Bridge tools exposed to pi

Each pi terminal launched by the extension loads a bundled pi extension that can call back into live VS Code APIs for read-only editor and LSP context. The same extension also updates pi's footer status every few seconds with the active VS Code file, cursor/selection, language id, unsaved-change marker, and diagnostic summary.

| Tool                           | What it returns                                                                                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vscode_get_editor_state`      | Aggregate snapshot of workspace folders, active editor metadata, current selection, latest cached selection, and open editors                                          |
| `vscode_get_selection`         | Current editor selection including selected text, file path, and coordinates; falls back to the latest cached selection when pi terminal focus hides the active editor |
| `vscode_get_workspace_folders` | Workspace folders for the current VS Code window                                                                                                                       |
| `vscode_get_diagnostics`       | VS Code diagnostics for a specific file or the whole workspace                                                                                                         |
| `vscode_get_document_symbols`  | Outline symbols for a file from the active language server                                                                                                             |
| `vscode_get_definitions`       | Symbol definition locations at a given file position                                                                                                                   |
| `vscode_get_type_definitions`  | Symbol type-definition locations at a given file position                                                                                                              |
| `vscode_get_implementations`   | Concrete implementation locations for an interface or abstract member                                                                                                  |
| `vscode_get_declarations`      | Symbol declaration locations at a given file position                                                                                                                  |
| `vscode_get_hover`             | Hover docs, inferred types, signatures, and markdown/code snippets from the language server                                                                            |
| `vscode_get_workspace_symbols` | Global workspace symbol search through VS Code language providers                                                                                                      |
| `vscode_get_references`        | Symbol references at a given file position                                                                                                                             |

### Notes

- Paths accepted by file-based bridge tools can be absolute or workspace-relative.
- Position-based tools use zero-based `{ line, character }` coordinates.
- `vscode_get_selection` falls back to the latest cached VS Code selection when focus is in the pi terminal and VS Code reports no active text editor.
- Oversized bridge tool results are capped; when a response exceeds the limit, the tool returns a valid JSON wrapper with `truncated: true`, original size metadata, and a `resultJsonPrefix` preview.

These bridge tools let pi inspect editor context, selections, diagnostics, symbols, definitions, declarations, implementations, hover/type info, workspace-wide symbol search, and references without exposing tools that open files, save buffers, apply edits, format documents, execute code actions, or show VS Code notifications.

## Configuration

| Setting                      | Default   | Description                                                                                                       |
| ---------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `pi-vscode.path`             | `""`      | Absolute path to the pi binary (auto-detected if empty)                                                           |
| `pi-vscode.terminalLocation` | `"panel"` | Where Pi terminals open: `"panel"` to avoid editor-tab replacement, or `"editor"` for the old split-editor layout |

On Windows, an extensionless `pi-vscode.path` is auto-probed for `.cmd`/`.exe`/`.ps1` variants so extensionless npm shims work out of the box.
