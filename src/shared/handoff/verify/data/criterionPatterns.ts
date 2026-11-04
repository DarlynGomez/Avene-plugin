/** A criterion number, the standard name, or a level, each allowed only when a criterion slot holds it */
export const CRITERION_PATTERNS: readonly { source: string; flags: string }[] = [
  { source: "\\b\\d+\\.\\d+\\.\\d+\\b", flags: "g" },
  { source: "\\bWCAG\\b", flags: "g" },
  { source: "\\bAAA?\\b", flags: "g" },
  { source: "\\bLevel\\s+A{1,3}\\b", flags: "g" }
];
