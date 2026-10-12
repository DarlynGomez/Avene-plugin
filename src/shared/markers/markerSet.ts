import type { Root } from "../grouping/groupingTypes";
import { pickRepresentativeInstance } from "../grouping/representativeInstance";
import type { IssueState } from "../issues/issueTypes";
import { markerLabel } from "./markerLabel";

/** The states that earn a marker, deferred, ignored and resolved never do */
export const MARKER_STATES: ReadonlySet<IssueState> = new Set(["open", "important"]);

/** One marker, on one layer of one root on one screen */
export interface Marker {
  signature: string;
  screenId: string;
  issueId: string;
  nodeId: string;
  label: string;
}

/**
 * One marker per root on the current screen
 * The pool is this screen's instances narrowed to open and important before the picker runs, so a
 * marker can never land on a deferred or ignored layer, wherever that layer is in document order
 */
export function buildMarkerSet(
  roots: readonly Root[],
  currentScreenId: string | null,
  designerSelectionOrder: readonly string[]
): Marker[] {
  if (currentScreenId === null) {
    return [];
  }
  const markers: Marker[] = [];
  for (const root of roots) {
    if (root.displayState === "deferred" || root.displayState === "decided") {
      continue;
    }
    const pool = root.instances.filter(
      (instance) => instance.screenId === currentScreenId && MARKER_STATES.has(instance.state)
    );
    if (pool.length === 0) {
      continue;
    }
    const representative = pickRepresentativeInstance(pool, MARKER_STATES, designerSelectionOrder);
    markers.push({
      signature: root.signature,
      screenId: currentScreenId,
      issueId: representative.issueId,
      nodeId: representative.nodeId,
      label: markerLabel({
        measuredRatio: representative.measuredRatio,
        requiredRatio: root.requiredRatio,
        important: root.displayState === "important",
        layersHere: pool.length
      })
    });
  }
  return markers;
}
