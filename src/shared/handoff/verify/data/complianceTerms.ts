/** Regular expression sources, matched without regard to case; a starting list for review */
export const COMPLIANCE_TERMS: readonly string[] = [
  "\\bcompliant\\b",
  "\\bcomplies\\b",
  "\\bcomply\\b",
  "\\bcompliance\\b",
  "\\bconforms?\\b",
  "\\bconformance\\b",
  "\\bconformant\\b",
  "\\bpass(?:es|ed)\\b",
  "\\bmeets?\\b",
  "\\bfully\\s+accessible\\b",
  "\\bcertified\\b",
  "\\bno\\s+issues\\b",
  "\\ball\\s+clear\\b",
  "\\bsafe\\s+to\\s+ship\\b"
];
