import {
  deferIssue,
  flagImportant,
  ignoreIssue,
  reopenIssue,
  type TransitionOutcome
} from "./stateMachine";
import type { IssueRecordMap } from "./issueStore";
import type { Issue } from "../../shared/issues/issueTypes";

export interface GroupActionOutcome {
  issueId: string;
  ok: boolean;
  reason?: string;
}

export interface GroupTransitionResult {
  record: IssueRecordMap;
  outcomes: readonly GroupActionOutcome[];
}

/** Each action runs the normal per issue transition and reports one outcome per id */
function applyToEach(
  record: IssueRecordMap,
  issueIds: readonly string[],
  transition: (issue: Issue) => TransitionOutcome
): GroupTransitionResult {
  let updated = record;
  const outcomes: GroupActionOutcome[] = [];
  for (const issueId of issueIds) {
    const issue = updated[issueId];
    if (!issue) {
      outcomes.push({ issueId, ok: false, reason: "That issue no longer exists." });
      continue;
    }
    const result = transition(issue);
    if (!result.ok) {
      outcomes.push({ issueId, ok: false, reason: result.reason });
      continue;
    }
    updated = { ...updated, [issueId]: result.issue };
    outcomes.push({ issueId, ok: true });
  }
  return { record: updated, outcomes };
}

/** Defers open instances and leaves important ones alone */
export function deferRoot(
  record: IssueRecordMap,
  issueIds: readonly string[]
): GroupTransitionResult {
  const eligible = issueIds.filter((id) => record[id]?.state === "open");
  return applyToEach(record, eligible, (issue) => deferIssue(issue, new Date().toISOString()));
}

/** Marks everything important, the state machine decides which can change */
export function markRootImportant(
  record: IssueRecordMap,
  issueIds: readonly string[]
): GroupTransitionResult {
  return applyToEach(record, issueIds, flagImportant);
}

/** Unmarking returns important instances to open, and only those: not deferred or ignored ones */
export function unmarkRootImportant(
  record: IssueRecordMap,
  issueIds: readonly string[]
): GroupTransitionResult {
  const eligible = issueIds.filter((id) => record[id]?.state === "important");
  return applyToEach(record, eligible, reopenIssue);
}

/** One reason, applied to every instance the designer includes */
export function ignoreRoot(
  record: IssueRecordMap,
  issueIds: readonly string[],
  reason: string,
  at: string
): GroupTransitionResult {
  return applyToEach(record, issueIds, (issue) => ignoreIssue(issue, reason, at));
}

/** Reopens only ignored instances */
export function reopenRoot(
  record: IssueRecordMap,
  issueIds: readonly string[]
): GroupTransitionResult {
  const eligible = issueIds.filter((id) => record[id]?.state === "ignored");
  return applyToEach(record, eligible, reopenIssue);
}

/** Reopens only deferred instances */
export function restoreDeferredRoot(
  record: IssueRecordMap,
  issueIds: readonly string[]
): GroupTransitionResult {
  const eligible = issueIds.filter((id) => record[id]?.state === "deferred");
  return applyToEach(record, eligible, reopenIssue);
}
