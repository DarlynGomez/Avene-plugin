import type { ExplanationKey } from "./explanationTypes";

/**
 * The lesson a finding opens: decorative text opens the exemptions lesson, size and weight open for large text,
 * and everything else, unknown included, opens the lesson on why contrast matters
 * Only these three are ever linked from a key, so a lesson with an open review flag is never reached this way
 */
export function moduleForKey(key: Pick<ExplanationKey, "role" | "size">): string {
  if (key.role === "decorative") return "M06";
  if (key.role === "unknown") return "M01";
  return key.size === "large" ? "M04" : "M01";
}
