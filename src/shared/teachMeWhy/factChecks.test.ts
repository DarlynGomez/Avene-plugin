import { describe, expect, it } from "vitest";
import type { Fact } from "./explanationTypes";
import { checkFactText, checkFactTextStrict } from "./factChecks";
import { FACT_LIBRARY } from "./facts";

function fact(overrides: Partial<Fact>): Fact {
  return {
    id: "F99",
    plain: "A plain sentence.",
    reviewerNote: "",
    source: "A Source",
    dateRead: "2026-10-14",
    readStatus: "full",
    excerptVerified: true,
    ...overrides
  };
}

describe("checkFactText", () => {
  it("finds no dash or banned term in the shipped fields of the real library", () => {
    expect(checkFactText(FACT_LIBRARY)).toEqual([]);
  });
  it("flags an en dash, an em dash and each banned term, in plain and in source", () => {
    const problems = checkFactText([
      fact({
        plain: "Low – contrast, WCAG, compliance, compliant and violation and AA and AAA — here."
      }),
      fact({ id: "F98", source: "WCAG Guide" })
    ]);
    const labels = problems.filter((p) => p.id === "F99").map((p) => p.problem);
    expect(labels).toEqual([
      "en or em dash",
      "WCAG",
      "compliance",
      "compliant",
      "violation",
      "AA",
      "AAA"
    ]);
    expect(problems).toContainEqual({ id: "F98", field: "source", problem: "WCAG" });
  });
  it("never checks the reviewer note, which may name WCAG", () => {
    expect(checkFactText([fact({ reviewerNote: "WCAG says so – note" })])).toEqual([]);
  });
  it("matches whole words only", () => {
    expect(checkFactText([fact({ plain: "Baa, Aardvark and noncompliant words." })])).toEqual([]);
  });
});

describe("checkFactTextStrict", () => {
  it("finds nothing in the real library now the W3C source lines are shortened", () => {
    expect(checkFactTextStrict(FACT_LIBRARY)).toEqual([]);
  });
  it("reports a success criterion or a criterion number in a source line", () => {
    const problems = checkFactTextStrict([
      fact({ source: "W3C, Understanding Success Criterion 1.4.3: Contrast" })
    ]);
    expect(problems.map((p) => p.problem)).toEqual(["success criterion", "criterion number"]);
  });
});
