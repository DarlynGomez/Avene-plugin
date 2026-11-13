import { readContrastEvidence } from "../issues/contrastEvidenceView";
import type { IssueSummary } from "../issues/issueTypes";
import type { GroupableFinding } from "./groupingTypes";

/** Turns an issue into plain data for grouping, null when it has no usable contrast evidence */
export function assembleGroupableFinding(
  issue: IssueSummary,
  documentOrder: number
): GroupableFinding | null {
  const evidence = readContrastEvidence(issue.ruleId, issue.evidence);
  if (!evidence || evidence.foregroundBinding === undefined) {
    return null;
  }
  if (issue.screenId === undefined || issue.screenName === undefined) {
    return null;
  }

  return {
    issueId: issue.id,
    nodeId: issue.nodeId,
    nodeName: issue.nodeName,
    screenId: issue.screenId,
    screenName: issue.screenName,
    state: issue.state,
    severity: issue.severityAtLastDetection,
    ...(issue.deferredAt === undefined ? {} : { deferredAt: issue.deferredAt }),
    measuredRatio: evidence.measuredRatio,
    requiredRatio: evidence.requiredRatio,
    foregroundHex: evidence.foregroundHex,
    backgroundHex: evidence.backgroundHex,
    foregroundBinding: evidence.foregroundBinding,
    backgroundBinding: null,
    documentOrder
  };
}

/** Assembles the whole list and drops issues that cannot be grouped */
export function assembleGroupableFindings(issues: readonly IssueSummary[]): GroupableFinding[] {
  return issues
    .map((issue, index) => assembleGroupableFinding(issue, index))
    .filter((finding): finding is GroupableFinding => finding !== null);
}
