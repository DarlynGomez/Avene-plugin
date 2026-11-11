import type { Marker } from "./markerSet";

export interface MarkerDiff {
  added: Marker[];
  removed: Marker[];
  unchanged: Marker[];
}

const keyOf = (marker: Marker): string => `${marker.signature}|${marker.screenId}`;
const sameMarker = (a: Marker, b: Marker): boolean => a.nodeId === b.nodeId && a.label === b.label;

/**
 * Only the difference needs writing
 * A marker that moved to another layer or changed its label is removed from the old one and added
 * to the new one, one that is the same is left alone
 */
export function diffMarkers(oldSet: readonly Marker[], newSet: readonly Marker[]): MarkerDiff {
  const before = new Map(oldSet.map((marker) => [keyOf(marker), marker]));
  const after = new Map(newSet.map((marker) => [keyOf(marker), marker]));
  const diff: MarkerDiff = { added: [], removed: [], unchanged: [] };

  for (const [key, marker] of after) {
    const previous = before.get(key);
    if (!previous) {
      diff.added.push(marker);
    } else if (sameMarker(previous, marker)) {
      diff.unchanged.push(marker);
    } else {
      diff.removed.push(previous);
      diff.added.push(marker);
    }
  }
  for (const [key, marker] of before) {
    if (!after.has(key)) {
      diff.removed.push(marker);
    }
  }
  return diff;
}
