import { displayLabel } from "./labels";
import type { StatusShape, TableStatus } from "./tableTypes";
import type { Audience, Label } from "./types";

const SHAPES: Record<Label, StatusShape> = {
  Detected: "triangle",
  Decision: "square",
  "Needs check": "diamond"
};

/** The words for a reader, the exact label for a developer, and a shape that says the same without color */
export function statusFor(label: Label, audience: Audience): TableStatus {
  return { label, text: displayLabel(label, audience), shape: SHAPES[label] };
}
