import { keyToString } from "./explanationKey";
import type { ExplanationEntry, ExplanationKey, ExplanationTable } from "./explanationTypes";

/** Only an approved entry with a named reviewer is ever returned, else the fixed template */
export function lookupExplanation(table: ExplanationTable, key: ExplanationKey): ExplanationEntry {
  const entry = table.entries[keyToString(key)];
  if (entry?.status === "approved" && entry.reviewer !== null && entry.reviewer.trim() !== "") {
    return entry;
  }
  return table.fallbacks[`${key.depth}`];
}
