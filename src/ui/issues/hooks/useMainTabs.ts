import { useCallback, useMemo, useState } from "react";

import type { Root } from "../../../shared/grouping/groupingTypes";
import { readContrastEvidence } from "../../../shared/issues/contrastEvidenceView";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
import type { ParticipantVisibility } from "../../../shared/study/participantVisibility";
import type { MainTab } from "../components/Header";
import { useTeachMeWhy } from "../teachMeWhy/useTeachMeWhy";

/** The two main tabs, a hidden Teach Me Why tab can never be the active one */
export function useMainTabs(
  visibility: Pick<ParticipantVisibility, "teachMeWhyTab" | "elementRoleQuestions">,
  reviewRoots: readonly Root[],
  decisionRoots: readonly Root[],
  issuesById: ReadonlyMap<string, IssueSummary>
) {
  const [mainTab, setMainTab] = useState<MainTab>("live-watch");
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
  return {
    activeTab: visibility.teachMeWhyTab ? mainTab : ("live-watch" as MainTab),
    onMainTabChange,
    teachMeWhy: state,
    openExplanation: visibility.teachMeWhyTab ? openFromCard : null
  };
}
