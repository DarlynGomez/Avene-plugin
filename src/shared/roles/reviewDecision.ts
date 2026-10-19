import type { ReviewRow } from "./reviewCsv";
import { ROLE_LABELS, type RoleLabel } from "./roleLabels";

/** What the layer is now, read from the file when the import runs */
export interface CurrentLayer {
  found: boolean;
  inputKey: string;
}

export type SkipReason = "notFound" | "layerChanged" | "labelNotOnList";

export type ReviewDecision =
  | { kind: "skip"; reason: SkipReason }
  | { kind: "leave" }
  | { kind: "remove" }
  | { kind: "write"; label: RoleLabel };

export interface ReviewResult {
  imported: number;
  removed: number;
  notFound: number;
  layerChanged: number;
  labelNotOnList: number;
  /** The file was not a role review export */
  unreadable: boolean;
}

export const NOT_READABLE: ReviewResult = {
  imported: 0,
  removed: 0,
  notFound: 0,
  layerChanged: 0,
  labelNotOnList: 0,
  unreadable: true
};

export function decideReviewRow(row: ReviewRow, current: CurrentLayer): ReviewDecision {
  if (!current.found) return { kind: "skip", reason: "notFound" };
  if (row.inputKey !== current.inputKey) return { kind: "skip", reason: "layerChanged" };
  const label = row.finalLabel.trim().toLowerCase() as RoleLabel;
  if (!ROLE_LABELS.includes(label)) return { kind: "skip", reason: "labelNotOnList" };
  if (row.reviewed.trim().toLowerCase() !== "yes") return { kind: "leave" };
  return label === "unsure" ? { kind: "remove" } : { kind: "write", label };
}
