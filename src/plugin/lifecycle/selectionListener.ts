import {
  applySelectionChange,
  initializeReEncounterState,
  markDeferred,
  type DeferredIssueRef,
  type ReEncounterState
} from "../accountability/reEncounter";
import { recordResurface } from "../accountability/stateMachine";
import {
  consumePluginSetSelectionMarker,
  recordDesignerSelection
} from "../accountability/adapter/canvasSelection";
import { loadIssues, saveIssues, type IssueRecordMap } from "../accountability/issueStore";
import { buildIssuesUpdatedMessage } from "./issueDisplay";
import { markersOnSelection } from "./markerSelection";

let reEncounterState: ReEncounterState = { waitingForSelectionToLeave: new Set() };

function collectDescendantIds(node: BaseNode, ids: Set<string>): void {
  ids.add(node.id);
  if ("children" in node) {
    for (const child of node.children) {
      collectDescendantIds(child, ids);
    }
  }
}

/**
 * Ids that count as selected, each selected node plus its descendants
 * Done downward so an ancestor selection matches with a plain has check
 */
function collectSelectedIdsIncludingDescendants(): Set<string> {
  const ids = new Set<string>();
  for (const node of figma.currentPage.selection) {
    collectDescendantIds(node, ids);
  }
  return ids;
}

function deferredRefs(record: IssueRecordMap): DeferredIssueRef[] {
  return Object.values(record)
    .filter((issue) => issue.state === "deferred")
    .map((issue) => ({ id: issue.id, nodeId: issue.nodeId }));
}

/** Called once at startup so a node still selected on reopen does not resurface instantly */
export async function initializeReEncounterFromCurrentSelection(): Promise<void> {
  const record = await loadIssues();
  reEncounterState = initializeReEncounterState(
    collectSelectedIdsIncludingDescendants(),
    deferredRefs(record)
  );
}

/** Called on defer so deferring a still selected node does not resurface it */
export function markIssueDeferred(issueId: string): void {
  reEncounterState = markDeferred(reEncounterState, issueId);
}

/**
 * Selections the plugin set itself are not the designer returning to anything
 * Defaults to false so existing callers are unaffected, the real listener always passes it
 */
export async function handleSelectionChange(isPluginOriginated: boolean = false): Promise<void> {
  // The same flag, read once for this event, tells the markers whether the designer moved
  markersOnSelection(isPluginOriginated);
  if (isPluginOriginated) {
    return;
  }

  recordDesignerSelection(figma.currentPage.selection.map((node) => node.id));

  const record = await loadIssues();
  const outcome = applySelectionChange(
    reEncounterState,
    collectSelectedIdsIncludingDescendants(),
    deferredRefs(record)
  );
  reEncounterState = outcome.state;

  if (outcome.resurfacedIssueIds.length === 0) {
    return;
  }

  let updated = record;
  for (const issueId of outcome.resurfacedIssueIds) {
    const issue = updated[issueId];
    if (issue) {
      updated = { ...updated, [issueId]: recordResurface(issue) };
    }
  }

  const saveResult = saveIssues(updated);
  if (!saveResult.saved) {
    console.error("selectionchange: failed to persist resurfaced issues", saveResult.error);
    return;
  }

  figma.ui.postMessage(await buildIssuesUpdatedMessage(updated));
}

export function registerSelectionChangeListener(): void {
  figma.on("selectionchange", () => {
    const isPluginOriginated = consumePluginSetSelectionMarker();
    void handleSelectionChange(isPluginOriginated);
  });
}
