import { describe, expect, it } from "vitest";
import type { Depth, ElementRole, ExplanationKey } from "./explanationTypes";
import { FACT_LIBRARY, FACT_MATRIX, allowedFacts, isShippable, shippableFacts } from "./facts";

function key(role: ElementRole, depth: Depth): ExplanationKey {
  return { role, severity: "medium", size: "normal", depth };
}
const ids = (facts: readonly { id: string }[]) => facts.map((fact) => fact.id);

describe("the fact library", () => {
  it("has F01 to F17 once each, with a source, a date and a read status", () => {
    expect(ids(FACT_LIBRARY)).toEqual(
      Array.from({ length: 17 }, (_, i) => `F${String(i + 1).padStart(2, "0")}`)
    );
    for (const fact of FACT_LIBRARY) {
      expect(fact.plain).not.toBe("");
      expect(fact.source).not.toBe("");
      expect(fact.dateRead).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("only uses ids the library has", () => {
    const known = new Set(ids(FACT_LIBRARY));
    for (const row of Object.values(FACT_MATRIX))
      for (const list of Object.values(row))
        for (const id of list ?? []) expect(known).toContain(id);
  });
});

describe("allowedFacts", () => {
  it("returns nothing at depth 1 for every role", () => {
    for (const role of Object.keys(FACT_MATRIX) as ElementRole[]) {
      expect(allowedFacts(key(role, 1))).toEqual([]);
    }
  });
  it("follows the matrix at depths 2 and 3", () => {
    expect(ids(allowedFacts(key("caption", 2)))).toEqual(["F16", "F17", "F12"]);
    expect(ids(allowedFacts(key("caption", 3)))).toEqual(["F01", "F02", "F03", "F06"]);
    expect(ids(allowedFacts(key("decorative", 2)))).toEqual(["F04"]);
    expect(ids(allowedFacts(key("unknown", 3)))).toEqual(["F01", "F02", "F03"]);
  });
  it("does not depend on severity or size", () => {
    const a = allowedFacts({ role: "body", severity: "low", size: "large", depth: 2 });
    const b = allowedFacts({ role: "body", severity: "high", size: "normal", depth: 2 });
    expect(ids(a)).toEqual(ids(b));
  });
});

describe("shippable facts", () => {
  it("clears a full read and a verified excerpt, never a summary or an unverified excerpt", () => {
    const base = FACT_LIBRARY[0];
    expect(isShippable({ ...base, readStatus: "full" })).toBe(true);
    expect(isShippable({ ...base, readStatus: "excerpt", excerptVerified: true })).toBe(true);
    expect(isShippable({ ...base, readStatus: "excerpt", excerptVerified: false })).toBe(false);
    expect(isShippable({ ...base, readStatus: "summary", excerptVerified: true })).toBe(false);
  });
  it("drops unverified excerpts from the matrix row", () => {
    expect(ids(shippableFacts(key("heading", 3)))).toEqual(["F01", "F03"]);
    expect(ids(shippableFacts(key("heading", 1)))).toEqual([]);
  });
});
