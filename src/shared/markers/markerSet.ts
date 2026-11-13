import type { Root } from "../grouping/groupingTypes";
import { pickRepresentativeInstance } from "../grouping/representativeInstance";
import type { IssueState } from "../issues/issueTypes";
import { markerLabel } from "./markerLabel";

/** The states that earn a full marker */
export const MARKER_STATES: ReadonlySet<IssueState> = new Set(["open", "important"]);

/** A root that is wholly deferred keeps a marker, drawn faded, ignored and resolved layers never get one */
const DEFERRED_STATES: ReadonlySet<IssueState> = new Set(["deferred"]);

/** One marker, on one layer of one root on one screen */
export interface Marker {
  signature: string;
  screenId: string;
  issueId: string;
  nodeId: string;
  label: string;
  /** The root is deferred, so the marker is drawn as a muted gray triangle and stays where it is */
  deferred?: boolean;
  /** The root is important, so its marker is a diamond and not a triangle */
  important?: boolean;
  /** How many layers of the root are marked on this screen, present only for a group of more than one */
  count?: number;
}

/** The group a designer clicked a marker of, and the layer of it that marker sits on */
export interface ExpandedMarker {
  signature: string;
  nodeId: string;
}

/**
 * One marker per root on the current screen, and one for every layer of the root that was clicked
 * The pool is this screen's instances narrowed to open and important before the picker runs, so a
 * marker can never land on an ignored layer, wherever that layer is in document order
 * A root that is only deferred has its deferred layers in the pool instead, and its marker is faded
 */
export function buildMarkerSet(
  roots: readonly Root[],
  currentScreenId: string | null,
  designerSelectionOrder: readonly string[],
  expanded: ExpandedMarker | null = null
): Marker[] {
  if (currentScreenId === null) {
    return [];
  }
  const markers: Marker[] = [];
  for (const root of roots) {
    if (root.displayState === "decided") {
      continue;
    }
    const deferred = root.displayState === "deferred";
    const states = deferred ? DEFERRED_STATES : MARKER_STATES;
    const pool = root.instances.filter(
      (instance) => instance.screenId === currentScreenId && states.has(instance.state)
    );
    if (pool.length === 0) {
      continue;
    }
    const representative = pickRepresentativeInstance(pool, states, designerSelectionOrder);
    // The root the designer clicked shows every layer it covers here, the others stay at one marker
    const open = expanded !== null && root.signature === expanded.signature;
    const shown = open ? pool : [representative];
    // Only the marker clicked carries the group's number, the ones that open beside it carry none
    const numbered =
      open && pool.some((layer) => layer.nodeId === expanded.nodeId)
        ? expanded.nodeId
        : representative.nodeId;
    for (const layer of shown) {
      markers.push({
        signature: root.signature,
        screenId: currentScreenId,
        issueId: layer.issueId,
        nodeId: layer.nodeId,
        ...(deferred ? { deferred: true } : {}),
        ...(root.displayState === "important" ? { important: true } : {}),
        ...(pool.length > 1 && layer.nodeId === numbered ? { count: pool.length } : {}),
        label: markerLabel({
          measuredRatio: layer.measuredRatio,
          requiredRatio: root.requiredRatio,
          important: root.displayState === "important",
          layersHere: pool.length
        })
      });
    }
  }
  return markers;
}
