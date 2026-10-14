import { describe, expect, it } from "vitest";
import tableData from "./explanationTable.json";
import type { Depth, ElementRole, ExplanationKey, ExplanationTable } from "./explanationTypes";
import { allowedFacts } from "./facts";
import { slotValues } from "./fillSlots";
import { validateExplanation, type RejectionCode } from "./validateExplanation";

const slots = slotValues(2.17, 4.5);
const filler = (count: number) => Array.from({ length: count }, () => "word").join(" ");

function key(depth: Depth, role: ElementRole = "body"): ExplanationKey {
  return { role, severity: "medium", size: "normal", depth };
}
/** A text of the right length for the depth, plus any extra sentence */
function check(depth: Depth, extra: string, used: string[] = [], role: ElementRole = "body") {
  const k = key(depth, role);
  const count = { 1: 30, 2: 70, 3: 110 }[depth];
  return validateExplanation({
    text: `${extra} ${filler(count)}`,
    key: k,
    usedFactIds: used,
    allowedFacts: allowedFacts(k),
    slots
  });
}
function codes(result: ReturnType<typeof check>): RejectionCode[] {
  return result.ok ? [] : result.reasons.map((reason) => reason.code);
}

describe("validateExplanation, passing", () => {
  it("accepts plain text of the right length with the two slots", () => {
    expect(check(1, "It is {measured} and needs {required}.").ok).toBe(true);
  });
  it("accepts the filled slot values as written", () => {
    expect(check(1, "It is 2.17:1 and needs 4.5:1.").ok).toBe(true);
  });
  it("accepts a number that is in a fact the explanation used", () => {
    expect(check(2, "A check of 83.9% of pages and 34 instances.", ["F15"]).ok).toBe(true);
    expect(check(3, "The scale runs from 1:1 to 21:1.", ["F01"]).ok).toBe(true);
  });
});

describe("validateExplanation, numbers", () => {
  it("rejects a stray percentage", () => {
    expect(codes(check(1, "About 40% of people notice."))).toContain("number-not-allowed");
  });
  it("rejects a number that is only in a fact the explanation did not use", () => {
    const result = check(2, "In a check, 83.9% of pages had it.", ["F16"]);
    expect(codes(result)).toContain("number-not-allowed");
  });
  it("rejects a ratio that is not a slot value", () => {
    expect(codes(check(1, "It needs 7:1."))).toContain("number-not-allowed");
  });
  it("matches numbers as written, so a bare 4.5 is not the slot 4.5:1", () => {
    expect(codes(check(1, "It needs 4.5 here."))).toContain("number-not-allowed");
  });
  it("allows a number only from a used fact that is allowed for the key", () => {
    // F03 is not in the body depth 2 row
    const result = check(2, "Text counts as large at 24 pixels.", ["F03"]);
    expect(codes(result)).toEqual(
      expect.arrayContaining(["fact-not-allowed", "number-not-allowed"])
    );
  });
});

describe("validateExplanation, facts", () => {
  it("rejects a fact id not allowed for the key", () => {
    const result = check(2, "x", ["F17"]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reasons.find((r) => r.code === "fact-not-allowed")?.detail).toBe(
      "F17"
    );
  });
  it("rejects any fact at depth 1", () => {
    expect(codes(check(1, "x", ["F16"]))).toContain("fact-not-allowed");
  });
  it("rejects an id that is not in the library at all", () => {
    expect(codes(check(2, "x", ["F99"]))).toContain("fact-not-allowed");
  });
});

describe("validateExplanation, banned terms", () => {
  it.each([
    "WCAG",
    "wcag",
    "AA",
    "AAA",
    "compliance",
    "compliant",
    "violation",
    "Success Criterion"
  ])("rejects %s as a whole word", (term) => {
    expect(codes(check(1, `This is ${term} here.`))).toContain("banned-term");
  });
  it("rejects a criterion number", () => {
    expect(codes(check(1, "See 1.4.3 for more."))).toContain("banned-term");
  });
  it("does not reject a banned term inside another word", () => {
    expect(check(1, "The baa of a lamb and a saa and noncompliant and aardvark.").ok).toBe(true);
    expect(check(1, "Violations and compliances are other words.").ok).toBe(true);
  });
  it("rejects a banned term next to punctuation", () => {
    expect(codes(check(1, "Is it (AA)? Yes."))).toContain("banned-term");
  });
});

describe("validateExplanation, dashes", () => {
  it("rejects an en dash and an em dash with their own reason", () => {
    expect(codes(check(1, "It is low \u2013 very low."))).toEqual(["dash"]);
    expect(codes(check(1, "It is low \u2014 very low."))).toEqual(["dash"]);
  });
  it("allows a hyphen inside a word and a spaced hyphen", () => {
    expect(check(1, "A low-contrast, semi-opaque, well-known case - fine.").ok).toBe(true);
  });
  it("allows curly apostrophes and quotes", () => {
    expect(check(1, "The heading\u2019s \u201Ccolour\u201D is low.").ok).toBe(true);
  });
});

describe("validateExplanation, length", () => {
  const limits: Array<[Depth, number, number]> = [
    [1, 25, 45],
    [2, 60, 90],
    [3, 100, 150]
  ];
  it.each(limits)("depth %i accepts %i to %i words and rejects outside", (depth, min, max) => {
    const run = (count: number) =>
      validateExplanation({
        text: filler(count),
        key: key(depth),
        usedFactIds: [],
        allowedFacts: [],
        slots
      });
    expect(run(min).ok).toBe(true);
    expect(run(max).ok).toBe(true);
    expect(run(min - 1)).toMatchObject({ ok: false });
    expect(run(max + 1)).toMatchObject({ ok: false });
    const short = run(min - 1);
    const long = run(max + 1);
    expect(!short.ok && short.reasons[0].code).toBe("too-short");
    expect(!long.ok && long.reasons[0].code).toBe("too-long");
  });
});

describe("validateExplanation, every reason", () => {
  it("returns all the reasons and not only the first", () => {
    const k = key(1);
    const result = validateExplanation({
      text: "WCAG says 40% here",
      key: k,
      usedFactIds: ["F16"],
      allowedFacts: allowedFacts(k),
      slots
    });
    expect(codes(result)).toEqual(
      expect.arrayContaining(["fact-not-allowed", "number-not-allowed", "banned-term", "too-short"])
    );
  });
  it("rejects an unknown slot", () => {
    expect(codes(check(1, "It is {ratio} here."))).toContain("unknown-slot");
  });
});

describe("the fixed templates", () => {
  const table = tableData as unknown as ExplanationTable;
  it.each([1, 2, 3] as const)("depth %i passes every check with no facts", (depth) => {
    const result = validateExplanation({
      text: table.fallbacks[`${depth}`].text,
      key: key(depth),
      usedFactIds: [],
      allowedFacts: [],
      slots
    });
    expect(result).toEqual({ ok: true });
  });
});
