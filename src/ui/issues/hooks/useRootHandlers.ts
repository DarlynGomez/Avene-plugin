import type { Root, RootDecision } from "../../../shared/grouping/groupingTypes";

export function instanceIds(root: Root): string[] {
  return root.instances.map((instance) => instance.issueId);
}

interface RootActions {
  markRootImportant: (issueIds: string[]) => void;
  unmarkRootImportant: (issueIds: string[]) => void;
  ignoreRoot: (
    issueIds: string[],
    reason: string,
    signature: string,
    fromDecisionOffer: boolean
  ) => void;
  closeSheet: () => void;
}

/** The root level actions the cards trigger, each fans out to every instance of the root */
export function useRootHandlers({
  markRootImportant,
  unmarkRootImportant,
  ignoreRoot,
  closeSheet
}: RootActions) {
  function handleToggleImportant(root: Root) {
    if (root.displayState === "important") {
      unmarkRootImportant(instanceIds(root));
    } else {
      markRootImportant(instanceIds(root));
    }
  }

  function handleApplyDecisionOffer(root: Root, decision: RootDecision) {
    ignoreRoot(instanceIds(root), decision.reason, root.signature, true);
  }

  function handleRecordIgnore(root: Root, reason: string) {
    ignoreRoot(instanceIds(root), reason, root.signature, false);
    closeSheet();
  }

  return { handleToggleImportant, handleApplyDecisionOffer, handleRecordIgnore };
}
