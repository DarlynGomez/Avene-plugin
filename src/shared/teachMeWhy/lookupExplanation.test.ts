import { describe, expect, it } from "vitest";
import tableData from "./explanationTable.json";
import { keyToString } from "./explanationKey";
import type { ExplanationEntry, ExplanationKey, ExplanationTable } from "./explanationTypes";
import { lookupExplanation } from "./lookupExplanation";

const table = tableData as unknown as ExplanationTable;
const key: ExplanationKey = { role: "body", severity: "high", size: "normal", depth: 1 };
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
  it("falls back to the Quick fallback when the key is missing", () => {
    const empty: ExplanationTable = { ...table, entries: {} };
    expect(lookupExplanation(empty, key)).toBe(table.fallbacks["1"]);
  });
  it("never returns an entry that was not approved", () => {
    const draft = { ...approved, status: "fallback" as const };
    expect(lookupExplanation(withEntry(draft), key)).toBe(table.fallbacks["1"]);
  });
  it("never returns an approved entry with no reviewer", () => {
    expect(lookupExplanation(withEntry({ ...approved, reviewer: null }), key)).toBe(
      table.fallbacks["1"]
    );
    expect(lookupExplanation(withEntry({ ...approved, reviewer: "  " }), key)).toBe(
      table.fallbacks["1"]
    );
  });
  it("ships one Quick fallback, and an entry is approved only with a reviewer", () => {
    for (const entry of Object.values(table.entries)) {
      if (entry.status === "approved") expect(entry.reviewer).toBeTruthy();
      else expect(entry.reviewer).toBeNull();
    }
    expect(Object.keys(table.fallbacks)).toEqual(["1"]);
    expect(table.fallbacks["1"].status).toBe("fallback");
    expect(table.fallbacks["1"].factIds).toEqual([]);
  });
});
