import { parseIssueId } from "../../shared/issues/issueId";
import { selectResolvedNodesAndZoom } from "../accountability/adapter/canvasSelection";
import type { Issue } from "../../shared/issues/issueTypes";
import type { IssueMessage, PluginToUiMessage } from "../../shared/messageTypes";
import {
  loadIssues,
  loadRawIssues,
  saveIssues,
  type IssueRecordMap
} from "../accountability/issueStore";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { isIssueMessage } from "./isIssueMessage";
import { recordIssueAction } from "./recordIssueAction";
import { buildIssuesUpdatedMessage } from "./issueDisplay";
import { markIssueDeferred } from "./selectionListener";
import {
  deferIssue,
  flagImportant,
  ignoreIssue,
  reopenIssue,
  type TransitionOutcome
} from "../accountability/stateMachine";

type Reply = (message: PluginToUiMessage) => void;

function actionFailed(issueId: string, message: string): PluginToUiMessage {
  return { type: "ISSUE_ACTION_FAILED", issueId, message };
}

async function replyWithFullList(reply: Reply): Promise<void> {
  const record = await loadIssues();
  reply(await buildIssuesUpdatedMessage(record));
}

/**
 * Loads the record, applies one transition to one issue and saves
 * A rejected transition or failed save stores nothing and replies ISSUE_ACTION_FAILED
 */
async function applyTransition(
  issueId: string,
  reply: Reply,
  transition: (record: IssueRecordMap) => TransitionOutcome | { ok: false; reason: string },
  onSaved?: (record: IssueRecordMap) => void
): Promise<void> {
  const record = await loadIssues();
  const result = transition(record);

  if (!result.ok) {
    reply(actionFailed(issueId, result.reason));
    return;
  }

  const updated: IssueRecordMap = { ...record, [issueId]: result.issue };
  const saveResult = saveIssues(updated);
  if (!saveResult.saved) {
    reply(actionFailed(issueId, saveResult.error ?? "The change could not be saved."));
    return;
  }

  onSaved?.(updated);
  reply(await buildIssuesUpdatedMessage(updated));
}

function transitionFor(
  record: IssueRecordMap,
  issueId: string,
  apply: (issue: Issue) => TransitionOutcome
) {
  const issue = record[issueId];
  if (!issue) {
    return { ok: false as const, reason: "That issue no longer exists." };
  }
  return apply(issue);
}

/** Selects the node and scrolls to it, never creates or changes a node */
async function focusIssue(issueId: string, reply: Reply): Promise<void> {
  const parsed = parseIssueId(issueId);
  if (!parsed) {
    reply(actionFailed(issueId, "That issue id could not be read."));
    return;
  }

  const node = await figma.getNodeByIdAsync(parsed.nodeId);
  if (!node || node.type === "DOCUMENT" || node.type === "PAGE") {
    reply(actionFailed(issueId, "That node no longer exists in this file."));
    return;
  }

  selectResolvedNodesAndZoom([node]);
  if (activeStudySession()) {
    recordIssueAction("locate", issueId, loadRawIssues());
  }
}

/** Handles the six inbound issue messages */
export async function handleIssueMessage(message: IssueMessage, reply: Reply): Promise<void> {
  switch (message.type) {
    case "ISSUES_SUBSCRIBE":
      await replyWithFullList(reply);
      return;
    case "ISSUE_DEFER":
      // Arm the guard on defer so a still selected node does not resurface right away
      await applyTransition(
        message.issueId,
        reply,
        (record) => transitionFor(record, message.issueId, deferIssue),
        (saved) => {
          markIssueDeferred(message.issueId);
          recordIssueAction("defer", message.issueId, saved);
        }
      );
      return;
    case "ISSUE_FLAG_IMPORTANT":
      await applyTransition(
        message.issueId,
        reply,
        (record) => transitionFor(record, message.issueId, flagImportant),
        (saved) => recordIssueAction("pin", message.issueId, saved)
      );
      return;
    case "ISSUE_REOPEN":
      await applyTransition(
        message.issueId,
        reply,
        (record) => transitionFor(record, message.issueId, reopenIssue),
        (saved) => recordIssueAction("reopen", message.issueId, saved)
      );
      return;
    case "ISSUE_IGNORE":
      await applyTransition(
        message.issueId,
        reply,
        (record) =>
          transitionFor(record, message.issueId, (issue) =>
            ignoreIssue(issue, message.reason, new Date().toISOString())
          ),
        (saved) => recordIssueAction("ignore", message.issueId, saved, message.reason)
      );
      return;
    case "ISSUE_FOCUS":
      await focusIssue(message.issueId, reply);
      return;
  }
}

export { isIssueMessage };
