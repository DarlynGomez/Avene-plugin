import type { IssueRecordMap } from "../accountability/issueStore";
import { loadDecisions } from "../accountability/decisionStore";
import { RULES } from "../detection/rules/registry";
import type { Issue, IssueSummary } from "../../shared/issues/issueTypes";
import type { IssuesUpdatedMessage } from "../../shared/messageTypes";
import { markersOnIssues } from "./markerRuntime";
import { resolveTextNodeSnapshot } from "./resolveSnapshot";

async function enrichForDisplay(issue: Issue): Promise<IssueSummary> {
  const snapshot = await resolveTextNodeSnapshot(issue.nodeId);
  if (!snapshot) {
    return { ...issue, nodeName: "(node not found)" };
  }

  const rule = RULES.find((registered) => registered.id === issue.ruleId);
  const finding = rule ? rule.evaluate(snapshot) : null;
  return {
    ...issue,
    nodeName: snapshot.nodeName,
    screenId: snapshot.screenId,
    screenName: snapshot.screenName,
    evidence: finding?.evidence
  };
}

/**
 * Builds the panel view of the record with node name, screen and live evidence
 * Recomputed on each build so a stale stored value is never shown
 */
export async function buildDisplayList(record: IssueRecordMap): Promise<IssueSummary[]> {
  return Promise.all(Object.values(record).map(enrichForDisplay));
}

/**
 * The one place ISSUES_UPDATED is assembled, so every caller sends the same shape:
 * the full issue list alongside the full decision record. loadDecisions is
 * synchronous, so bundling it here costs nothing extra over building the list alone
 */
export async function buildIssuesUpdatedMessage(
  record: IssueRecordMap
): Promise<IssuesUpdatedMessage> {
  const issues = await buildDisplayList(record);
  // Every list that reaches the panel also moves the markers
  markersOnIssues(issues);
  return { type: "ISSUES_UPDATED", issues, decisions: loadDecisions() };
}
