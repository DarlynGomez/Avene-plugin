import type { ExplanationEntry, ExplanationTable } from "./explanationTypes";
import { composeQuickText, QUICK_KEYS, type QuickParts } from "./quickText";

export const QUICK_PROVENANCE =
  "Parts drafted with AI assistance (Claude), reviewed by the research team, composed by script from TEACH_ME_WHY_QUICK_V3_1.json. No model runs at runtime.";

/** The key whose text also stands in at depth 1 when an entry is missing or not yet approved */
const FALLBACK_SOURCE = "unknown:medium:normal:1";

/**
 * The table as the 42 depth 1 entries and the one fallback, nothing else is carried over
 * Without a reviewer the entries are written as pending, and the lookup does not show a pending entry
 */
export function buildQuickTable(parts: QuickParts, reviewer: string | null): ExplanationTable {
  const quick: [string, ExplanationEntry][] = QUICK_KEYS.map((key) => [
    key,
    {
      text: composeQuickText(parts.keys[key]),
      status: reviewer ? "approved" : "fallback",
      reviewer,
      factIds: []
    }
  ]);
  const entries = Object.fromEntries(quick);
  return {
    provenance: QUICK_PROVENANCE,
    fallbacks: {
      "1": { text: entries[FALLBACK_SOURCE].text, status: "fallback", reviewer: null, factIds: [] }
    },
    entries
  };
}
