import type { VerifyContext } from "./types";

export const TEMPLATE = [
  'Detected: "{L1}" on {S1}: text {fg1} on {bg1}, measured {r1}:1, needs {q1}:1 ({sc}). {c1} layers on this screen share this pair. Bound to {b1}.',
  "Decision: {w1} (recorded {d1})",
  "Needs check (owner: PM): {w2}"
];

export const SLOTS: Record<string, string> = {
  L1: "Helper text",
  L2: "UI",
  S1: "Payment",
  fg1: "#9A9A9A",
  bg1: "#FFFFFF",
  r1: "2.8",
  q1: "4.5",
  sc: "WCAG 1.4.3",
  c1: "3",
  b1: "text/muted",
  w1: "Brand color",
  d1: "2026-10-28",
  w2: "Where does focus go",
  zz: "not in this block"
};

export const CTX: VerifyContext = { templateLines: TEMPLATE, slots: SLOTS };

/** A rewrite that keeps every label, id and rule */
export const GOOD = [
  'Detected: "{L1}" on {S1}: the text color {fg1} on {bg1} measures {r1}:1 and needs {q1}:1 ({sc}). {c1} layers on this screen share the pair. Bound to {b1}.',
  "Decision: {w1} (recorded {d1})",
  "Needs check (owner: PM): {w2}"
];

/** GOOD with one line replaced */
export function withLine(index: number, line: string): string[] {
  return GOOD.map((original, i) => (i === index ? line : original));
}
