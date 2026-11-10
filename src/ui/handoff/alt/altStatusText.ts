import type { AltStatus } from "../../../shared/handoff/alt/altTypes";
import type { AltRoot } from "../../../shared/handoff/alt/altRoots";

/** Plain words for where a layer stands, never a verdict on it */
export function layerStatusText(status: AltStatus): string {
  if (status === "answered") return "Has a note";
  return status === "decorative" ? "Decorative" : "Needs a note";
}

export function rootStatusText(root: AltRoot): string {
  if (root.unanswered > 0) {
    return root.layers.length === 1
      ? "Needs a note"
      : `${root.unanswered} of ${root.layers.length} need a note`;
  }
  return root.layers.every((layer) => layer.status === "decorative") ? "Decorative" : "Has a note";
}
