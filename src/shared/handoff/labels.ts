import type { Audience, Label } from "./types";

export const LABEL_DETECTED: Label = "Detected";
export const LABEL_DECISION: Label = "Decision";
export const LABEL_NEEDS_CHECK: Label = "Needs check";

export const LABELS: readonly Label[] = [LABEL_DETECTED, LABEL_DECISION, LABEL_NEEDS_CHECK];

const PLAIN_NAMES: Record<Label, string> = {
  Detected: "Measured",
  Decision: "Decided",
  "Needs check": "Still to check"
};

/** Developers see the canonical labels, everyone else sees plain words */
export function displayLabel(label: Label, audience: Audience): string {
  return audience === "developer" ? label : PLAIN_NAMES[label];
}

/** A label, then an optional owner, then a colon and a space */
const LINE_START = /^(Detected|Decision|Needs check)(?: \(owner: (?:Dev|PM|Design)\))?: /;

export function startsWithLabel(line: string): boolean {
  return LINE_START.test(line);
}
