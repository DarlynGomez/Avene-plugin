import { useMemo, useState } from "react";

import type { RootDecision } from "../../../shared/grouping/groupingTypes";
import type { GroupBy } from "../../../shared/grouping/sectionRoots";
import { combineHeadline } from "../../../shared/handoff/alt/combineHeadline";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
import { useAltChecks } from "../../handoff/alt/AltChecksContext";
import type { StateFilter } from "../components/FilterBar";
import { useRoots } from "./useRoots";

/** The filter and grouping choice together with the roots they produce */
export function usePanelView(
  issues: readonly IssueSummary[],
  decisions: Readonly<Record<string, RootDecision>>
) {
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("root-cause");
  const roots = useRoots(issues, decisions, groupBy, stateFilter);
  const alt = useAltChecks();
  // With the alt text checks on, the line over the list and the tab badge count both kinds, and only then
  const headline = useMemo(() => {
    if (!alt.available) return roots.headline;
    const screens = new Set(
      roots.reviewRoots.flatMap((root) =>
        root.instances.filter((i) => i.state === "open").map((i) => i.screenId)
      )
    );
    return combineHeadline(roots.headline, screens, alt.counts);
  }, [alt.available, alt.counts, roots.headline, roots.reviewRoots]);
  return { stateFilter, setStateFilter, groupBy, setGroupBy, ...roots, headline };
}
