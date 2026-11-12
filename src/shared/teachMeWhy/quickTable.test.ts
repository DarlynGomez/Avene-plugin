import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import tableData from "./explanationTable.json";
import type { ExplanationTable } from "./explanationTypes";
import { DEPTH_WORD_LIMITS } from "./explanationTypes";
import { lookupExplanation } from "./lookupExplanation";
import { parseKeyString } from "./explanationKey";
import { buildQuickTable, QUICK_PROVENANCE } from "./quickTable";
import { composeQuickText, plainWords, QUICK_KEYS, type QuickParts } from "./quickText";

const table = tableData as unknown as ExplanationTable;
const SOURCE = "docs/study/teach-me-why/TEACH_ME_WHY_QUICK_V3_1.json";
const textOf = (key: string) => table.entries[key].text;
const headlineOf = (key: string) => textOf(key).split("\n\n")[0];
const FORBIDDEN = [
  /darken the text/i,
  /lighten the background/i,
  /bolder/i,
  /\bfeel/i,
  /mark it as decorative/i,
  /bold/i,
  /\badjust/i
];

describe("the shipped Quick texts", () => {
  it("hold exactly the 42 depth 1 keys, and no other depth 1 entry", () => {
    const quick = Object.keys(table.entries).filter((key) => key.endsWith(":1"));
    expect([...quick].sort()).toEqual([...QUICK_KEYS].sort());
  });
  it("are in the shape the card reads, a headline, a blank line, then dashed bullets", () => {
    for (const key of QUICK_KEYS) {
      const [headline, list, ...rest] = textOf(key).split("\n\n");
      expect(headline).not.toMatch(/^- /);
      expect(rest).toEqual([]);
      expect((list ?? "").split("\n").every((line) => line.startsWith("- "))).toBe(true);
    }
  });
  it("carry no forbidden wording, no digits and no slots", () => {
    for (const key of QUICK_KEYS) {
      for (const pattern of FORBIDDEN) expect(textOf(key), key).not.toMatch(pattern);
      expect(textOf(key), key).not.toMatch(/[\d{}]/);
    }
  });
  it("never mention a shape behind the text for a button", () => {
    for (const key of QUICK_KEYS.filter((name) => name.startsWith("button text"))) {
      expect(textOf(key), key).not.toMatch(/shape behind/i);
    }
  });
  it("start every non decorative headline with Nudge or Move", () => {
    for (const key of QUICK_KEYS.filter((name) => !name.startsWith("decorative"))) {
      expect(headlineOf(key), key).toMatch(/^(Nudge|Move)\b/);
    }
  });
  it("name the same frame wherever a shape behind the text is offered", () => {
    const named = QUICK_KEYS.filter((name) => !/^(button text|decorative)/.test(name));
    for (const key of named) expect(textOf(key), key).toContain("in the same frame");
  });
  it("stay inside the depth 1 word limits, counted without the list markers", () => {
    const { min, max } = DEPTH_WORD_LIMITS[1];
    for (const key of QUICK_KEYS) {
      expect(plainWords(textOf(key)), key).toBeGreaterThanOrEqual(min);
      expect(plainWords(textOf(key)), key).toBeLessThanOrEqual(max);
    }
  });
  it("set the depth 1 limits at 35 to 60 and leave depths 2 and 3", () => {
    expect(DEPTH_WORD_LIMITS).toEqual({
      1: { min: 35, max: 60 },
      2: { min: 60, max: 90 },
      3: { min: 100, max: 150 }
    });
  });
  it("resolve through the lookup to the imported text once approved, never to a fallback", () => {
    const approved: ExplanationTable = {
      ...table,
      entries: Object.fromEntries(
        Object.entries(table.entries).map(([key, entry]) => [
          key,
          { ...entry, status: "approved", reviewer: "test" }
        ])
      )
    };
    for (const key of QUICK_KEYS) {
      const parsed = parseKeyString(key);
      if (!parsed) throw new Error(`${key} is not a key`);
      const found = lookupExplanation(approved, parsed);
      expect(found.text, key).toBe(textOf(key));
      // The unknown medium normal text is also the fallback text, so it is told apart by its entry
      expect(found, key).toBe(approved.entries[key]);
    }
  });
  it("are pending together or approved together, with a reviewer whenever approved", () => {
    const states = new Set(QUICK_KEYS.map((key) => table.entries[key].status));
    expect(states.size).toBe(1);
    for (const key of QUICK_KEYS) {
      const entry = table.entries[key];
      if (entry.status === "approved") expect(entry.reviewer).toBeTruthy();
      else expect(entry.reviewer).toBeNull();
    }
  });
});

describe("the depth 1 fallback", () => {
  it("is the unknown medium normal text, with no forbidden phrase", () => {
    expect(table.fallbacks["1"].text).toBe(textOf("unknown:medium:normal:1"));
    expect(table.fallbacks["1"].status).toBe("fallback");
    for (const pattern of FORBIDDEN) expect(table.fallbacks["1"].text).not.toMatch(pattern);
  });
});

describe("the provenance", () => {
  it("names no model and says no model runs at runtime", () => {
    expect(table.provenance).toBe(QUICK_PROVENANCE);
    expect(table.generation).toBeUndefined();
    expect(QUICK_PROVENANCE).toMatch(/No model runs at runtime\.$/);
  });
});

describe("buildQuickTable", () => {
  const parts: QuickParts = {
    version: 3,
    keys: Object.fromEntries(
      QUICK_KEYS.map((key) => [key, { headline: `Move ${key}.`, bullets: ["One."] }])
    )
  };
  it("replaces depth 1, carries depths 2 and 3 and the other fallbacks over untouched", () => {
    const built = buildQuickTable(table, parts, null);
    const deeper = (entries: ExplanationTable["entries"]) =>
      Object.entries(entries).filter(([key]) => !key.endsWith(":1"));
    expect(deeper(built.entries)).toEqual(deeper(table.entries));
    expect(built.fallbacks["2"]).toEqual(table.fallbacks["2"]);
    expect(built.fallbacks["3"]).toEqual(table.fallbacks["3"]);
    expect(built.entries[QUICK_KEYS[0]].text).toBe(composeQuickText(parts.keys[QUICK_KEYS[0]]));
  });
  it("writes pending entries with no reviewer, and approved ones only when a reviewer is given", () => {
    expect(buildQuickTable(table, parts, null).entries[QUICK_KEYS[0]]).toMatchObject({
      status: "fallback",
      reviewer: null
    });
    expect(buildQuickTable(table, parts, "DG").entries[QUICK_KEYS[0]]).toMatchObject({
      status: "approved",
      reviewer: "DG"
    });
  });
});

describe("the table matches the parts file", () => {
  if (!existsSync(SOURCE)) {
    console.warn(`quickTable: ${SOURCE} is not here, the check against the parts file is skipped`);
    it.skip("is composed from the parts file", () => undefined);
    return;
  }
  it("is composed from the parts file", () => {
    const parts = JSON.parse(readFileSync(SOURCE, "utf8")) as QuickParts;
    for (const key of QUICK_KEYS) expect(textOf(key)).toBe(composeQuickText(parts.keys[key]));
  });
});
