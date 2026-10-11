import { useState } from "react";

import type { RootDecision } from "../../../shared/grouping/groupingTypes";
import type { GroupBy } from "../../../shared/grouping/sectionRoots";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
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
  return { stateFilter, setStateFilter, groupBy, setGroupBy, ...roots };
}
