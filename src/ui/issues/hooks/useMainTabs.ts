import { useCallback, useMemo, useState } from "react";

import type { Root } from "../../../shared/grouping/groupingTypes";
import { readContrastEvidence } from "../../../shared/issues/contrastEvidenceView";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
import type { ParticipantVisibility } from "../../../shared/study/participantVisibility";
import { useHandoffAvailable } from "../../handoff/useHandoffAvailable";
import type { MainTab } from "../components/Header";
import { useTeachMeWhy } from "../teachMeWhy/useTeachMeWhy";

/** A hidden tab can never be the active one */
function activeTabOf(tab: MainTab, teachMeWhyOn: boolean, handoffOn: boolean): MainTab {
  if (tab === "handoff") return handoffOn ? "handoff" : "live-watch";
  return teachMeWhyOn ? tab : "live-watch";
}

/** The main tabs, Teach Me Why and Handoff show only when their gates are open */
export function useMainTabs(
  visibility: Pick<ParticipantVisibility, "teachMeWhyTab" | "elementRoleQuestions">,
  reviewRoots: readonly Root[],
  decisionRoots: readonly Root[],
  issuesById: ReadonlyMap<string, IssueSummary>
) {
  const handoffOn = useHandoffAvailable();
  const [mainTab, setMainTab] = useState<MainTab>("live-watch");
  // A lesson asked for from outside the tab, the count makes asking for the same one again count
  const [requestedModule, setRequestedModule] = useState<{ id: string; count: number } | null>(
    null
  );
  const roots = useMemo(() => [...reviewRoots, ...decisionRoots], [reviewRoots, decisionRoots]);
  // The font size sits in the evidence of the issue a root shows, a slot in the text asks for it
  const fontSizeOf = useCallback(
    (issueId: string): number | null => {
      const issue = issuesById.get(issueId);
      const evidence = issue ? readContrastEvidence(issue.ruleId, issue.evidence) : null;
      return evidence?.fontSizePx ?? null;
    },
    [issuesById]
  );
  const { state, openFromCard, openFromTabBar } = useTeachMeWhy(
    roots,
    setMainTab,
    fontSizeOf,
    visibility.teachMeWhyTab && visibility.elementRoleQuestions
  );

  const onMainTabChange = useCallback(
    (tab: MainTab) => (tab === "teach-me-why" ? openFromTabBar() : setMainTab(tab)),
    [openFromTabBar]
  );
  const openModule = useCallback((id: string) => {
    setRequestedModule((previous) => ({ id, count: (previous?.count ?? 0) + 1 }));
    setMainTab("teach-me-why");
  }, []);
  const links = useMemo(
    () => (visibility.teachMeWhyTab ? { openRoot: openFromCard, openModule } : null),
    [visibility.teachMeWhyTab, openFromCard, openModule]
  );
  return {
    activeTab: activeTabOf(mainTab, visibility.teachMeWhyTab, handoffOn),
    onMainTabChange,
    handoffTab: handoffOn,
    teachMeWhy: { ...state, requestedModule },
    openExplanation: links
  };
}
