import type { SelectionMessage } from "../../shared/selectionMessageTypes";
import { loadRawIssues } from "../accountability/issueStore";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { emitIssueAction } from "../study/emitIssueAction";
import {
  getStoredSelectionToRestore,
  restoreSelection,
  selectAndZoomToFit
} from "../accountability/adapter/canvasSelection";

export function isSelectionMessage(value: unknown): value is SelectionMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const message = value as Record<string, unknown>;
  if (message.type === "SHOW_ON_CANVAS") {
    return (
      Array.isArray(message.nodeIds) &&
      message.nodeIds.every((id) => typeof id === "string") &&
      (message.signature === undefined || typeof message.signature === "string")
    );
  }
  return message.type === "RESTORE_SELECTION";
}

/** The click counts as an action, the selection the plugin makes in answer to it does not */
function recordShowOnCanvas(nodeIds: readonly string[], signature: string | undefined): void {
  if (!activeStudySession()) {
    return;
  }
  const shown = Object.values(loadRawIssues()).filter((issue) => nodeIds.includes(issue.nodeId));
  const first = shown[0];
  emitIssueAction({
    action: "show_on_canvas",
    target: signature
      ? { kind: "root", signature }
      : { kind: "issue", issueId: first?.id ?? nodeIds[0] ?? "" },
    issueIds: shown.map((issue) => issue.id),
    instanceCount: nodeIds.length,
    resultingState: first?.state ?? "open"
  });
}

/**
 * Selection and zoom only, nothing is written and neither message replies
 * The panel already knows what it asked for so the count is tracked client side
 */
export async function handleSelectionMessage(message: SelectionMessage): Promise<void> {
  if (message.type === "SHOW_ON_CANVAS") {
    await selectAndZoomToFit(message.nodeIds);
    recordShowOnCanvas(message.nodeIds, message.signature);
    return;
  }
  await restoreSelection(getStoredSelectionToRestore());
}
