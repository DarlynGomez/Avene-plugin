import { handleExplanationOrRole, isExplanationOrRole } from "./lifecycle/otherProtocols";
import { requestRoleCommand } from "./roles/adapter/roleCommands";
import { handleAdjustMessage } from "./lifecycle/adjustProtocol";
import { isAdjustMessage } from "./lifecycle/isAdjustMessage";
import {
  registerAdjustCloseRestore,
  registerAdjustSelectionRestore
} from "./lifecycle/adjustLifecycle";
import { handleCalibrationMessage, isCalibrationMessage } from "./lifecycle/calibrationProtocol";
// Temporary, see exportIssuesDebug.ts for how to remove it
import { exportIssuesToConsole } from "./lifecycle/exportIssuesDebug";
import { handleIssueMessage, isIssueMessage } from "./lifecycle/issuesProtocol";
import { handleRootMessage, isRootMessage } from "./lifecycle/rootActionsProtocol";
import { handleSelectionMessage, isSelectionMessage } from "./lifecycle/selectionProtocol";
import { resetStudyData } from "./study/adapter/resetStudyData";
import { startDetectionLifecycle } from "./lifecycle/startup";
import { handleStudyMessage, sendStudyState } from "./lifecycle/studyProtocol";
import { isStudyMessage } from "../shared/study/studyMessageGuards";
import { resetCalibration, type CalibrationResetResult } from "./storage/resetCalibration";

const RESET_COMMAND = "reset-calibration";
const RESET_STUDY_COMMAND = "reset-study";
const EXPORT_ISSUES_COMMAND = "export-issues"; // TEMPORARY, see exportIssuesDebug.ts
const UI_WIDTH = 460;
const UI_HEIGHT = 680;

// postMessage takes the payload directly and Figma adds the pluginMessage wrapper
// Do not wrap it here

async function handleUiMessage(rawMessage: unknown): Promise<void> {
  if (!rawMessage || typeof rawMessage !== "object") {
    console.warn("Dropped a plugin message that was not an object", rawMessage);
    return;
  }

  const message = rawMessage as Record<string, unknown>;

  if (isCalibrationMessage(message)) {
    await handleCalibrationMessage(message, (reply) => figma.ui.postMessage(reply));
    return;
  }

  if (isStudyMessage(message)) {
    await handleStudyMessage(message, (reply) => figma.ui.postMessage(reply));
    return;
  }

  if (isExplanationOrRole(message)) {
    await handleExplanationOrRole(message, (reply) => figma.ui.postMessage(reply));
    return;
  }

  if (isIssueMessage(message)) {
    // The study state goes first so the UI never draws the unrestricted panel
    if (message.type === "ISSUES_SUBSCRIBE") {
      sendStudyState((reply) => figma.ui.postMessage(reply));
    }
    await handleIssueMessage(message, (reply) => figma.ui.postMessage(reply));
    return;
  }

  if (isRootMessage(message)) {
    await handleRootMessage(message, (reply) => figma.ui.postMessage(reply));
    return;
  }

  if (isSelectionMessage(message)) {
    await handleSelectionMessage(message);
    return;
  }

  if (isAdjustMessage(message)) {
    await handleAdjustMessage(message, (reply) => figma.ui.postMessage(reply));
    return;
  }

  console.warn("Dropped an unrecognized plugin message", message.type);
}

/** Build a notification that names which reset surface failed and why */
function describeResetOutcome(result: CalibrationResetResult): string {
  if (result.fileCleared && result.userCleared) {
    return "Cleared user calibration and file calibration";
  }

  const parts = [
    result.userCleared
      ? "User calibration cleared."
      : `User calibration not cleared: ${result.userError ?? "unknown error"}.`,
    result.fileCleared
      ? "File calibration cleared."
      : `File calibration not cleared: ${result.fileError ?? "unknown error"}.`
  ];
  return parts.join(" ");
}

/** Run the development reset command: clear both surfaces, report the result, then close */
export async function runReset(): Promise<void> {
  try {
    const result = await resetCalibration();
    const fullyCleared = result.fileCleared && result.userCleared;
    figma.notify(describeResetOutcome(result), fullyCleared ? undefined : { error: true });
  } catch (error) {
    console.error("Calibration reset failed unexpectedly", error);
    const message = error instanceof Error && error.message ? error.message : String(error);
    figma.notify(`Reset failed: ${message}`, { error: true });
  } finally {
    figma.closePlugin();
  }
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

/** Normal startup: wire the message router and open the calibration UI */
export function startCalibrationUi(): void {
  figma.ui.onmessage = handleUiMessage;
  figma.showUI(__html__, { width: UI_WIDTH, height: UI_HEIGHT });
}

if (figma.command === RESET_COMMAND) {
  void runReset();
} else if (figma.command === RESET_STUDY_COMMAND) {
  runResetStudy();
} else if (figma.command === EXPORT_ISSUES_COMMAND) {
  void exportIssuesToConsole().finally(() => figma.closePlugin());
} else {
  requestRoleCommand(figma.command);
  startCalibrationUi();
  // Ahead of detection so no issue list can reach the UI before the study state
  sendStudyState((reply) => figma.ui.postMessage(reply));
  registerAdjustSelectionRestore();
  registerAdjustCloseRestore();
  // Fire and forget so the calibration UI does not wait on live detection
  // A failure here must not block it
  startDetectionLifecycle().catch((error: unknown) => {
    console.error("Detection lifecycle failed to start", error);
  });
}
