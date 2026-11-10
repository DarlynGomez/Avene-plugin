import { isStudyActive } from "../../shared/study/studyActive";
import { resetStudyData } from "../study/adapter/resetStudyData";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { exportIssuesToConsole } from "./exportIssuesDebug";
import { runDetectionCheck } from "./detectionCheck";

export const RESET_STUDY_COMMAND = "reset-study";
export const DEBUG_COMMANDS: readonly string[] = [
  "export-issues",
  "detection-check",
  RESET_STUDY_COMMAND
];

const OFF_IN_STUDY = "This command is off while a study session is active";

/** Development only: empties the study session and block records so a file can be tested again */
function runResetStudy(): void {
  const result = resetStudyData();
  const ok = result.failed.length === 0;
  figma.notify(
    ok
      ? "Cleared the study session and recorded issues, decisions and Adjust log"
      : `Could not clear: ${result.failed.map((item) => `${item.key} (${item.reason})`).join(", ")}`,
    ok ? undefined : { error: true }
  );
  figma.closePlugin();
}

/**
 * The menu commands that never open the panel
 * Each one shows or erases study data, so none runs while a session is active, exiting study mode ends that
 */
export async function runDebugCommand(command: string): Promise<void> {
  if (isStudyActive(activeStudySession())) {
    figma.notify(OFF_IN_STUDY, { error: true });
    figma.closePlugin();
    return;
  }
  if (command === RESET_STUDY_COMMAND) {
    runResetStudy();
    return;
  }
  if (command === "detection-check") {
    await runDetectionCheck();
    return;
  }
  await exportIssuesToConsole();
  figma.closePlugin();
}
