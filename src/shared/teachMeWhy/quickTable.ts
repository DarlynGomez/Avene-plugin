import type { ExplanationEntry, ExplanationTable } from "./explanationTypes";
import { composeQuickText, QUICK_KEYS, type QuickParts } from "./quickText";

export const QUICK_PROVENANCE =
  "Parts drafted with AI assistance (Claude), reviewed by the research team, composed by script from TEACH_ME_WHY_QUICK_V3_1.json. No model runs at runtime.";

/** The key whose text also stands in at depth 1 when an entry is missing or not yet approved */
const FALLBACK_SOURCE = "unknown:medium:normal:1";

/**
 * The table with its 42 depth 1 entries replaced, depths 2 and 3 and their fallbacks are carried over as they are
 * Without a reviewer the entries are written as pending, and the lookup does not show a pending entry
 */
export function buildQuickTable(
  existing: ExplanationTable,
  parts: QuickParts,
  reviewer: string | null
): ExplanationTable {
  const kept = Object.entries(existing.entries).filter(([key]) => !key.endsWith(":1"));
  const quick: [string, ExplanationEntry][] = QUICK_KEYS.map((key) => [
    key,
    {
      text: composeQuickText(parts.keys[key]),
      status: reviewer ? "approved" : "fallback",
      reviewer,
      factIds: []
    }
  ]);
  const entries = Object.fromEntries([...quick, ...kept]);
  return {
    provenance: QUICK_PROVENANCE,
    fallbacks: {
      ...existing.fallbacks,
      "1": { text: entries[FALLBACK_SOURCE].text, status: "fallback", reviewer: null, factIds: [] }
    },
    entries
  };
}
