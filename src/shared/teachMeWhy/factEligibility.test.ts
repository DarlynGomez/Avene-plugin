import { describe, expect, it } from "vitest";
import { buildEligibilityMap } from "./eligibilityMap";
import {
  ELEMENT_ROLES,
  type Depth,
  type ElementRole,
  type ExplanationKey
} from "./explanationTypes";
import {
  EXCLUSIVE_GROUPS,
  NEVER_OFFER,
  STORY_FACTS,
  eligibleFacts,
  exclusiveViolations,
  unassignedFacts
} from "./factEligibility";
import { FACT_LIBRARY } from "./facts";
import { slotValues } from "./fillSlots";
import { validateExplanation } from "./validateExplanation";

const key = (role: ElementRole, depth: Depth): ExplanationKey => ({
  role,
  severity: "high",
  size: "normal",
  depth
});
const ids = (list: readonly { id: string }[]) => list.map((fact) => fact.id);
const everyKey = ELEMENT_ROLES.flatMap((role) =>
  ([1, 2, 3] as const).map((depth) => key(role, depth))
);

describe("eligibleFacts", () => {
  it("offers nothing at depth 1", () => {
    for (const role of ELEMENT_ROLES) expect(eligibleFacts(key(role, 1))).toEqual([]);
  });
  it("never offers F11 or F25 in any row", () => {
    expect([...NEVER_OFFER].sort()).toEqual(["F11", "F25"]);
    for (const k of everyKey) expect(ids(eligibleFacts(k))).not.toContain("F11");
    for (const k of everyKey) expect(ids(eligibleFacts(k))).not.toContain("F25");
  });
  it("offers F21 for button text rows only", () => {
    const rowsWith = everyKey.filter((k) => ids(eligibleFacts(k)).includes("F21"));
    expect(rowsWith.map((k) => `${k.role} ${k.depth}`)).toEqual(["button text 2"]);
  });
  it("leaves F05, F08 and F14 with no row at all", () => {
    expect(unassignedFacts()).toEqual(["F05", "F08", "F14"]);
    for (const k of everyKey) {
      for (const id of ["F05", "F08", "F14"]) expect(ids(eligibleFacts(k))).not.toContain(id);
    }
  });
  it("offers F07 at depth 2 for body, caption, label, button text and unknown only", () => {
    const rows = everyKey.filter((k) => ids(eligibleFacts(k)).includes("F07"));
    expect(rows.map((k) => `${k.role} ${k.depth}`)).toEqual([
      "body 2",
      "caption 2",
      "label 2",
      "button text 2",
      "unknown 2"
    ]);
  });
  it("offers F03 on large keys only", () => {
    const withF03 = everyKey.filter((k) =>
      ids(eligibleFacts({ ...k, size: "normal" })).includes("F03")
    );
    expect(withF03).toEqual([]);
    expect(ids(eligibleFacts({ ...key("heading", 3), size: "large" }))).toContain("F03");
  });
  it("offers only verified facts", () => {
    const verified = new Set(
      FACT_LIBRARY.filter((f) => f.excerptVerified || f.readStatus === "full").map((f) => f.id)
    );
    for (const k of everyKey) for (const f of eligibleFacts(k)) expect(verified).toContain(f.id);
  });
});

describe("exclusive facts", () => {
  it("names the two groups", () => {
    expect(EXCLUSIVE_GROUPS).toEqual([
      ["F15", "F18"],
      ["F22", "F23"]
    ]);
  });
  it("reports a group used twice and nothing for one from each group", () => {
    expect(exclusiveViolations(["F15", "F18"])).toEqual([["F15", "F18"]]);
    expect(exclusiveViolations(["F22", "F23", "F15"])).toEqual([["F22", "F23"]]);
    expect(exclusiveViolations(["F15", "F22"])).toEqual([]);
  });
  it("makes the validator reject both facts of a group in one explanation", () => {
    const k = key("body", 2);
    const words = Array.from({ length: 70 }, () => "word").join(" ");
    const result = validateExplanation({
      text: words,
      key: k,
      usedFactIds: ["F15", "F18"],
      allowedFacts: eligibleFacts(k),
      slots: slotValues(2.2, 4.5)
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reasons.map((r) => r.code)).toContain("facts-exclusive");
  });
});

describe("numbers in the newer facts", () => {
  const k = key("body", 2);
  const check = (extra: string, used: string[]) =>
    validateExplanation({
      text: `${extra} ${Array.from({ length: 70 }, () => "word").join(" ")}`,
      key: k,
      usedFactIds: used,
      allowedFacts: eligibleFacts(k),
      slots: slotValues(2.2, 4.5)
    });
  it("allows the 10% in F19 and nothing else", () => {
    expect(check("For the 10% of people who struggle most.", ["F19"]).ok).toBe(true);
    expect(check("For 20% of people.", ["F19"]).ok).toBe(false);
  });
  it("allows no number at all with F20, which has none", () => {
    expect(check("Older people outdoors.", ["F20"]).ok).toBe(true);
    expect(check("Older people, about 30% outdoors.", ["F20"]).ok).toBe(false);
  });
  it("marks F17 and F23 as stories", () => {
    expect([...STORY_FACTS].sort()).toEqual(["F17", "F23"]);
  });
});

describe("buildEligibilityMap", () => {
  it("has a line for every fact, with the rows added on 2026-10-14 starred", () => {
    const map = buildEligibilityMap();
    expect(map).toHaveLength(FACT_LIBRARY.length);
    expect(map.find((r) => r.id === "F14")?.note).toContain("unassigned");
    expect(map.find((r) => r.id === "F11")?.rows).toEqual([]);
    expect(map.find((r) => r.id === "F21")?.rows).toEqual(["button text D2*"]);
    expect(map.find((r) => r.id === "F16")?.rows).toContain("heading D2");
    expect(map.find((r) => r.id === "F07")?.rows).toContain("body D2*");
  });
});
