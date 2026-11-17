import { isStudyActive } from "../../shared/study/studyActive";
import { STUDY_BUILD } from "../../shared/studyBuild";
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
const OFF_IN_STUDY_BUILD = "This command is off in the study build";

/** Refuses and closes while a session is active, so no menu command can touch a running block */
export function refuseWhileStudyActive(): boolean {
  if (!isStudyActive(activeStudySession())) return false;
  figma.notify(OFF_IN_STUDY, { error: true });
  figma.closePlugin();
  return true;
}

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
  if (refuseWhileStudyActive()) return;
  if (command === RESET_STUDY_COMMAND) {
    // A participant can open the plugin menu after exit, and this erases a block's records from the file
    if (STUDY_BUILD) {
      figma.notify(OFF_IN_STUDY_BUILD, { error: true });
      figma.closePlugin();
      return;
    }
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
