import { useCallback, useMemo, useState } from "react";

import type { Root } from "../../../shared/grouping/groupingTypes";
import {
  buildExplanationView,
  type ExplanationView
} from "../../../shared/teachMeWhy/explanationView";
import { EXPLANATION_TABLE } from "../../../shared/teachMeWhy/explanationTableData";
import type { Depth } from "../../../shared/teachMeWhy/explanationTypes";
import { resolveFocusRoot } from "../../../shared/teachMeWhy/resolveFocusRoot";
import { toInstanceRoles } from "../../../shared/roles/lookupRole";
import { useRoleState, type RoleQuestionState } from "../../roles/useRoleState";
import { focusRootCard } from "../hooks/useMarkerSignals";
import { sendExplanationEvent } from "./sendExplanationEvent";

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
  /** The question about what kind of text the shown issue is, null when it may not be shown */
  role: RoleQuestionState | null;
}

/**
 * Which root is shown, the depth, and what has been hidden, all held here and none of it saved
 * Opening, a depth change and hiding are reported to the sandbox for the study log
 */
export function useTeachMeWhy(
  roots: readonly Root[],
  setTab: (tab: "live-watch" | "teach-me-why") => void,
  fontSizeOf: (issueId: string) => number | null,
  roleQuestionsShown = false
) {
  const [depth, setDepth] = useState<Depth>(1);
  const [lastOpened, setLastOpened] = useState<string | null>(null);
  const [hiddenRoots, setHiddenRoots] = useState<ReadonlySet<string>>(new Set());

  const root = useMemo(
    () => resolveFocusRoot(roots, NO_SELECTION, lastOpened),
    [roots, lastOpened]
  );
  const layerId =
    root?.instances.find((instance) => instance.issueId === root.representativeIssueId)?.nodeId ??
    null;
  const role = useRoleState(layerId, roleQuestionsShown);
  const answered = role.view?.answer?.role ?? null;
  const ruleRole = role.view?.rule?.role ?? null;
  // The answer wins, then the rule, and a model suggestion is never read until it is answered
  const rolesFor = useCallback(
    (nodeId: string) => (nodeId === layerId ? toInstanceRoles(ruleRole, answered) : undefined),
    [layerId, ruleRole, answered]
  );
  const view = useMemo(
    () =>
      root
        ? buildExplanationView(
            root,
            depth,
            EXPLANATION_TABLE,
            rolesFor,
            fontSizeOf(root.representativeIssueId)
          )
        : null,
    [root, depth, fontSizeOf, rolesFor]
  );

  const open = useCallback(
    (target: Root, source: "tab" | "card") => {
      setLastOpened(target.signature);
      const opened = buildExplanationView(
        target,
        depth,
        EXPLANATION_TABLE,
        rolesFor,
        fontSizeOf(target.representativeIssueId)
      );
      sendExplanationEvent({ kind: "opened", key: opened.key, source });
    },
    [depth, fontSizeOf, rolesFor]
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
    role: roleQuestionsShown ? role : null,
    backToIssue: () => {
      const signature = root?.signature;
      setTab("live-watch");
      if (signature) window.setTimeout(() => focusRootCard(signature), 0);
    }
  };
  return { state, openFromCard, openFromTabBar };
}
