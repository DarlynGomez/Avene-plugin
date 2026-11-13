import type { Issue, IssueState } from "./issueTypes";

const VALID_STATES: ReadonlySet<string> = new Set([
  "open",
  "deferred",
  "ignored",
  "important",
  "resolved"
]);
const VALID_SEVERITIES: ReadonlySet<string> = new Set(["low", "medium", "high"]);

function isValidState(value: unknown): value is IssueState {
  return typeof value === "string" && VALID_STATES.has(value);
}

/** Stored fields only, rule id and node id live in the map key */
export type PersistedIssueFields = Omit<Issue, "id" | "ruleId" | "nodeId">;

function hasValidPersistedFields(issue: Record<string, unknown>): boolean {
  const hasRequiredFields =
    isValidState(issue.state) &&
    typeof issue.severityAtLastDetection === "string" &&
    VALID_SEVERITIES.has(issue.severityAtLastDetection) &&
    typeof issue.encounterCount === "number" &&
    typeof issue.lastDetectedAt === "string";

  if (!hasRequiredFields) {
    return false;
  }
  if (issue.ignoredReason !== undefined && typeof issue.ignoredReason !== "string") {
    return false;
  }
  if (issue.ignoredAt !== undefined && typeof issue.ignoredAt !== "string") {
    return false;
  }
  if (issue.deferredAt !== undefined && typeof issue.deferredAt !== "string") {
    return false;
  }
  if (
    issue.severityAtIgnore !== undefined &&
    (typeof issue.severityAtIgnore !== "string" || !VALID_SEVERITIES.has(issue.severityAtIgnore))
  ) {
    return false;
  }
  if (issue.changedSinceIgnore !== undefined && typeof issue.changedSinceIgnore !== "boolean") {
    return false;
  }
  return true;
}

/** Checks the shape of what is stored on disk */
export function isPersistedIssueFields(value: unknown): value is PersistedIssueFields {
  if (!value || typeof value !== "object") {
    return false;
  }
  return hasValidPersistedFields(value as Record<string, unknown>);
}

/** Structural validation for a full, reconstructed issue, id/ruleId/nodeId included */
export function isIssue(value: unknown): value is Issue {
  if (!value || typeof value !== "object") {
    return false;
  }
  const issue = value as Record<string, unknown>;
  if (
    typeof issue.id !== "string" ||
    typeof issue.ruleId !== "string" ||
    typeof issue.nodeId !== "string"
  ) {
    return false;
  }
  return hasValidPersistedFields(issue);
}
