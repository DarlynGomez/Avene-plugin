import { describe, expect, it } from "vitest";
import tableData from "./explanationTable.json";
import { keyToString } from "./explanationKey";
import type { ExplanationEntry, ExplanationKey, ExplanationTable } from "./explanationTypes";
import { lookupExplanation } from "./lookupExplanation";

const table = tableData as unknown as ExplanationTable;
const key: ExplanationKey = { role: "body", severity: "high", size: "normal", depth: 2 };
const approved: ExplanationEntry = {
  text: "Reviewed words",
  status: "approved",
  reviewer: "A. Reviewer",
  factIds: ["F16"]
};
function withEntry(entry: ExplanationEntry): ExplanationTable {
  return { ...table, entries: { [keyToString(key)]: entry } };
}

describe("lookupExplanation", () => {
  it("returns the approved entry for its key", () => {
    expect(lookupExplanation(withEntry(approved), key)).toBe(approved);
  });
  it("falls back to the template for that depth when the key is missing", () => {
    expect(lookupExplanation(table, key)).toBe(table.fallbacks["2"]);
    expect(lookupExplanation(table, { ...key, depth: 3 })).toBe(table.fallbacks["3"]);
    expect(lookupExplanation(table, { ...key, depth: 1 })).toBe(table.fallbacks["1"]);
  });
  it("never returns an entry that was not approved", () => {
    const draft = { ...approved, status: "fallback" as const };
    expect(lookupExplanation(withEntry(draft), key)).toBe(table.fallbacks["2"]);
  });
  it("never returns an approved entry with no reviewer", () => {
    expect(lookupExplanation(withEntry({ ...approved, reviewer: null }), key)).toBe(
      table.fallbacks["2"]
    );
    expect(lookupExplanation(withEntry({ ...approved, reviewer: "  " }), key)).toBe(
      table.fallbacks["2"]
    );
  });
  it("ships a person written template for every depth, and only approved entries", () => {
    for (const entry of Object.values(table.entries)) {
      expect(entry.status).toBe("approved");
      expect(entry.reviewer).toBeTruthy();
    }
    for (const depth of ["1", "2", "3"] as const) {
      expect(table.fallbacks[depth].status).toBe("fallback");
      expect(table.fallbacks[depth].factIds).toEqual([]);
    }
  });
});
