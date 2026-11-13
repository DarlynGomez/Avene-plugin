import type { Issue, IssueState, Severity } from "../../shared/issues/issueTypes";
import { isSeverityWorse } from "../../shared/issues/severityRank";

export type TransitionOutcome = { ok: true; issue: Issue } | { ok: false; reason: string };

function rejected(reason: string): TransitionOutcome {
  return { ok: false, reason };
}

function accepted(issue: Issue): TransitionOutcome {
  return { ok: true, issue };
}

/** A brand new issue: always starts open, with no encounters yet */
export function createIssue(
  id: string,
  ruleId: string,
  nodeId: string,
  severity: Severity,
  detectedAt: string
): Issue {
  return {
    id,
    ruleId,
    nodeId,
    state: "open",
    severityAtLastDetection: severity,
    encounterCount: 0,
    lastDetectedAt: detectedAt
  };
}

const DEFERRABLE_FROM: ReadonlySet<IssueState> = new Set(["open", "important"]);
const FLAGGABLE_FROM: ReadonlySet<IssueState> = new Set(["open", "deferred"]);
const IGNORABLE_FROM: ReadonlySet<IssueState> = new Set(["open", "deferred", "important"]);
const REOPENABLE_FROM: ReadonlySet<IssueState> = new Set(["deferred", "important", "ignored"]);

/** open or important to deferred: put off, not dismissed, the time is kept so its marker can fade */
export function deferIssue(issue: Issue, at?: string): TransitionOutcome {
  if (!DEFERRABLE_FROM.has(issue.state)) {
    return rejected(`Cannot defer an issue in state '${issue.state}'`);
  }
  return accepted({ ...issue, state: "deferred", deferredAt: at });
}

/** open or deferred to important: designer-flagged, steady, never fades */
export function flagImportant(issue: Issue): TransitionOutcome {
  if (!FLAGGABLE_FROM.has(issue.state)) {
    return rejected(`Cannot flag an issue in state '${issue.state}' as important`);
  }
  return accepted({ ...issue, state: "important", deferredAt: undefined });
}

/** Needs a non empty reason, checked here so a bad message cannot skip it */
export function ignoreIssue(issue: Issue, reason: string, at: string): TransitionOutcome {
  if (!IGNORABLE_FROM.has(issue.state)) {
    return rejected(`Cannot ignore an issue in state '${issue.state}'`);
  }
  if (reason.trim().length === 0) {
    return rejected("A reason is required to ignore an issue");
  }
  return accepted({
    ...issue,
    state: "ignored",
    deferredAt: undefined,
    ignoredReason: reason,
    ignoredAt: at,
    severityAtIgnore: issue.severityAtLastDetection,
    changedSinceIgnore: false
  });
}

/** deferred, important, or ignored back to open, only by an explicit designer action */
export function reopenIssue(issue: Issue): TransitionOutcome {
  if (!REOPENABLE_FROM.has(issue.state)) {
    return rejected(`Cannot reopen an issue in state '${issue.state}'`);
  }
  return accepted({ ...issue, state: "open", deferredAt: undefined });
}

/** The node of a deferred issue was selected again after the guard cleared */
export function recordResurface(issue: Issue): Issue {
  return { ...issue, encounterCount: issue.encounterCount + 1 };
}

/**
 * Folds a fresh scan into an existing issue
 * An issue only resolves when its finding stops, a resolved one reopens as the same record
 * An ignored issue reopens once if severity gets worse, same or better stays ignored
 */
export function reconcileDetection(
  issue: Issue,
  latestSeverity: Severity | null,
  detectedAt: string
): Issue {
  if (latestSeverity === null) {
    return issue.state === "resolved" ? issue : { ...issue, state: "resolved" };
  }

  if (issue.state === "resolved") {
    return {
      ...issue,
      state: "open",
      severityAtLastDetection: latestSeverity,
      lastDetectedAt: detectedAt
    };
  }

  if (issue.state === "ignored") {
    const worsened = issue.severityAtIgnore
      ? isSeverityWorse(latestSeverity, issue.severityAtIgnore)
      : false;
    return {
      ...issue,
      state: worsened ? "open" : "ignored",
      changedSinceIgnore: worsened ? true : issue.changedSinceIgnore,
      severityAtLastDetection: latestSeverity,
      lastDetectedAt: detectedAt
    };
  }

  return { ...issue, severityAtLastDetection: latestSeverity, lastDetectedAt: detectedAt };
}
