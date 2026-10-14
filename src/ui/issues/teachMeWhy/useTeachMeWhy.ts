import { useCallback, useMemo, useState } from "react";

import type { Root } from "../../../shared/grouping/groupingTypes";
import {
  buildExplanationView,
  type ExplanationView
} from "../../../shared/teachMeWhy/explanationView";
import { EXPLANATION_TABLE } from "../../../shared/teachMeWhy/explanationTableData";
import type { Depth } from "../../../shared/teachMeWhy/explanationTypes";
import { resolveFocusRoot } from "../../../shared/teachMeWhy/resolveFocusRoot";
import { focusRootCard } from "../hooks/useMarkerSignals";
import { sendExplanationEvent } from "./sendExplanationEvent";

const NO_ROLES = () => undefined;
const NO_SELECTION: ReadonlySet<string> = new Set();

export interface TeachMeWhyState {
  root: Root | null;
  view: ExplanationView | null;
  depth: Depth;
  hidden: boolean;
  changeDepth: (depth: Depth) => void;
  hide: () => void;
  showAgain: () => void;
  backToIssue: () => void;
}

/**
 * Which root is shown, the depth, and what has been hidden, all held here and none of it saved
 * Opening, a depth change and hiding are reported to the sandbox for the study log
 */
export function useTeachMeWhy(
  roots: readonly Root[],
  setTab: (tab: "live-watch" | "teach-me-why") => void
) {
  const [depth, setDepth] = useState<Depth>(1);
  const [lastOpened, setLastOpened] = useState<string | null>(null);
  const [hiddenRoots, setHiddenRoots] = useState<ReadonlySet<string>>(new Set());

  const root = useMemo(
    () => resolveFocusRoot(roots, NO_SELECTION, lastOpened),
    [roots, lastOpened]
  );
  const view = useMemo(
    () => (root ? buildExplanationView(root, depth, EXPLANATION_TABLE, NO_ROLES) : null),
    [root, depth]
  );

  const open = useCallback(
    (target: Root, source: "tab" | "card") => {
      setLastOpened(target.signature);
      const opened = buildExplanationView(target, depth, EXPLANATION_TABLE, NO_ROLES);
      sendExplanationEvent({ kind: "opened", key: opened.key, source });
    },
    [depth]
  );

  /** The link on a root card */
  const openFromCard = useCallback(
    (signature: string) => {
      const target = roots.find((candidate) => candidate.signature === signature);
      if (!target) return;
      open(target, "card");
      setTab("teach-me-why");
    },
    [roots, open, setTab]
  );

  /** The tab bar, which shows the root the rules in the spec pick, or the empty state */
  const openFromTabBar = useCallback(() => {
    const target = resolveFocusRoot(roots, NO_SELECTION, lastOpened);
    if (target) open(target, "tab");
    setTab("teach-me-why");
  }, [roots, lastOpened, open, setTab]);

  const state: TeachMeWhyState = {
    root,
    view,
    depth,
    hidden: root !== null && hiddenRoots.has(root.signature),
    changeDepth: (next) => {
      if (view && next !== depth) {
        sendExplanationEvent({ kind: "depth_changed", key: view.key, toDepth: next });
      }
      setDepth(next);
    },
    hide: () => {
      if (!root || !view) return;
      sendExplanationEvent({ kind: "dismissed", key: view.key });
      setHiddenRoots((current) => new Set(current).add(root.signature));
    },
    showAgain: () => {
      if (!root) return;
      setHiddenRoots((current) => {
        const next = new Set(current);
        next.delete(root.signature);
        return next;
      });
    },
    backToIssue: () => {
      const signature = root?.signature;
      setTab("live-watch");
      if (signature) window.setTimeout(() => focusRootCard(signature), 0);
    }
  };
  return { state, openFromCard, openFromTabBar };
}
