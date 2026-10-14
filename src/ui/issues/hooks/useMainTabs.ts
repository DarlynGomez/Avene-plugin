import { useCallback, useMemo, useState } from "react";

import type { Root } from "../../../shared/grouping/groupingTypes";
import type { ParticipantVisibility } from "../../../shared/study/participantVisibility";
import type { MainTab } from "../components/Header";
import { useTeachMeWhy } from "../teachMeWhy/useTeachMeWhy";

/** The two main tabs, a hidden Teach Me Why tab can never be the active one */
export function useMainTabs(
  visibility: Pick<ParticipantVisibility, "teachMeWhyTab">,
  reviewRoots: readonly Root[],
  decisionRoots: readonly Root[]
) {
  const [mainTab, setMainTab] = useState<MainTab>("live-watch");
  const roots = useMemo(() => [...reviewRoots, ...decisionRoots], [reviewRoots, decisionRoots]);
  const { state, openFromCard, openFromTabBar } = useTeachMeWhy(roots, setMainTab);

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
