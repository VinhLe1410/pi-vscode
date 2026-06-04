import type { BridgeState } from "./types.ts";

export function createBridgeState(
  initialSelection: BridgeState["latestSelection"],
  onTerminalSession?: (terminalId: string, sessionFile: string) => void,
): BridgeState {
  return {
    latestSelection: initialSelection,
    reportTerminalSession(terminalId, sessionFile) {
      onTerminalSession?.(terminalId, sessionFile);
    },
  };
}
