import type { Root } from "../grouping/groupingTypes";
import { backgroundSourceName, readContrastEvidence } from "../issues/contrastEvidenceView";
import type { IssueSummary } from "../issues/issueTypes";
import type { FocusItem } from "./types";

/** The deferred roots as calendar items, a root with no readable evidence is left out */
export function focusItemsOf(
  roots: readonly Root[],
  issuesById: ReadonlyMap<string, IssueSummary>,
  counts: Readonly<Record<string, number>>
): FocusItem[] {
  return roots.flatMap((root): FocusItem[] => {
    const issue = issuesById.get(root.representativeIssueId);
    const instance = root.instances.find((i) => i.issueId === root.representativeIssueId);
    const evidence = issue ? readContrastEvidence(issue.ruleId, issue.evidence) : null;
    const count = counts[root.signature] ?? 0;
    if (root.displayState !== "deferred" || !evidence || !instance || count === 0) return [];
    const foreground = root.foregroundBinding ?? root.foregroundHex;
    const background = instance.backgroundBinding ?? root.backgroundHex;
    return [
      {
        signature: root.signature,
        name: `${foreground} on ${background}`,
        measuredRatio: evidence.measuredRatio,
        requiredRatio: evidence.requiredRatio,
        foregroundHex: root.foregroundHex,
        backgroundHex: root.backgroundHex,
        binding: root.foregroundBinding,
        ancestor: backgroundSourceName(evidence),
        layers: root.instances.length,
        deferCount: count,
        nodeId: instance.nodeId
      }
    ];
  });
}
