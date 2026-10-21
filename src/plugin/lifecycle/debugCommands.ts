import { exportIssuesToConsole } from "./exportIssuesDebug";
import { runDetectionCheck } from "./detectionCheck";

export const DEBUG_COMMANDS: readonly string[] = ["export-issues", "detection-check"];

/** The menu commands that only report, they never open the panel or start detection */
export async function runDebugCommand(command: string): Promise<void> {
  if (command === "detection-check") {
    await runDetectionCheck();
    return;
  }
  await exportIssuesToConsole();
  figma.closePlugin();
}
