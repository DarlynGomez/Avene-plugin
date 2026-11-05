import { useMemo } from "react";

import { assembleGroupableFindings } from "../../../shared/grouping/assembleFinding";
import { deriveRoots } from "../../../shared/grouping/deriveRoots";
import type { Root, RootDecision } from "../../../shared/grouping/groupingTypes";
import { computeHeadline } from "../../../shared/grouping/headline";
import { type GroupBy, sectionRoots } from "../../../shared/grouping/sectionRoots";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
import type { StateFilter } from "../components/FilterBar";

const DISPLAY_ORDER: Record<Root["displayState"], number> = {
  important: 0,
  open: 1,
  deferred: 2,
  decided: 3
};

function sortByPrecedence(roots: readonly Root[]): Root[] {
  return [...roots].sort((a, b) => DISPLAY_ORDER[a.displayState] - DISPLAY_ORDER[b.displayState]);
}

function matchesFilter(root: Root, filter: StateFilter): boolean {
  if (filter === "all") {
    return root.displayState !== "decided";
  }
  if (filter === "pinned") {
    return root.displayState === "important";
  }
  return root.displayState === "deferred";
}

/**
 * Wraps the pure grouping code over the live records
 * Roots are derived once and shared by the headline, counts and list
 * Ignored roots skip the sections and render in the decisions view
 */
export function useRoots(
  issues: readonly IssueSummary[],
  decisions: Readonly<Record<string, RootDecision>>,
  groupBy: GroupBy,
  stateFilter: StateFilter
) {
  const findings = useMemo(() => assembleGroupableFindings(issues), [issues]);
  const allRoots = useMemo(() => deriveRoots(findings), [findings]);
  const headline = useMemo(() => computeHeadline(allRoots), [allRoots]);

  const reviewRoots = useMemo(
    () => allRoots.filter((root) => root.displayState !== "decided"),
    [allRoots]
  );

  const counts = useMemo(
    () => ({
      all: reviewRoots.length,
      pinned: allRoots.filter((root) => root.displayState === "important").length,
      deferred: allRoots.filter((root) => root.displayState === "deferred").length,
      ignored: allRoots.filter((root) => root.displayState === "decided").length,
      openRoots: allRoots.filter((root) => root.instances.some((i) => i.state === "open")).length,
      openIssues: allRoots.reduce(
        (sum, root) => sum + root.instances.filter((i) => i.state === "open").length,
        0
      )
    }),
    [allRoots, reviewRoots]
  );

  const decisionRoots = useMemo(
    () => allRoots.filter((root) => root.displayState === "decided"),
    [allRoots]
  );

  const filteredSections = useMemo(
    () =>
      sectionRoots(findings, groupBy)
        .map((section) => ({
          ...section,
          roots: sortByPrecedence(section.roots.filter((root) => matchesFilter(root, stateFilter)))
        }))
        .filter((section) => section.roots.length > 0),
    [findings, groupBy, stateFilter]
  );

  const issuesById = useMemo(() => new Map(issues.map((issue) => [issue.id, issue])), [issues]);

  return {
    decisions,
    headline,
    counts,
    reviewRoots,
    filteredSections,
    decisionRoots,
    issuesById
  };
}
