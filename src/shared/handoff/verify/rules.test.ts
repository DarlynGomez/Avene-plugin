import { describe, expect, it } from "vitest";

import { verifyModelOutput } from "./verifyBlock";
import { CTX, GOOD, SLOTS, TEMPLATE, withLine } from "./verifyFixtures";
import type { RuleId } from "./types";

const FIRST = GOOD[0];
const rulesOf = (sentences: unknown, ctx = CTX) =>
  verifyModelOutput(sentences, ctx).blocking.map((v) => v.rule);
const matchesOf = (sentences: unknown, rule: RuleId) =>
  verifyModelOutput(sentences, CTX)
    .blocking.filter((v) => v.rule === rule)
    .map((v) => v.match);

describe("a rewrite that keeps every rule", () => {
  it("passes with nothing to say", () => {
    expect(verifyModelOutput(GOOD, CTX)).toEqual({ ok: true, blocking: [], warnings: [] });
  });

  it("passes the template text itself", () => {
    expect(verifyModelOutput(TEMPLATE, CTX).ok).toBe(true);
  });
});

describe("R1 numbers", () => {
  it.each([
    ["a digit run", FIRST.replace("share the pair", "share the pair, 7 times"), "7"],
    ["a longer run", FIRST.replace("{c1} layers", "30 layers"), "30"],
    ["a ratio of its own", FIRST.replace("{q1}:1", "5.5:1"), "5.5"],
    ["a spelled-out number", FIRST.replace("{c1} layers", "seven layers"), "seven"],
    ["a spelled-out number in capitals", FIRST.replace("{c1} layers", "Twenty layers"), "twenty"],
    ["hundred", FIRST.replace("{c1} layers", "a hundred layers"), "hundred"]
  ])("rejects %s", (_name, line, match) => {
    expect(matchesOf(withLine(0, line), "R1")).toEqual([match]);
  });

  it.each([
    ["an id", FIRST],
    ["a slot value written out", FIRST.replace("{c1} layers", "3 layers")],
    ["a ratio value written out", FIRST.replace("{r1}:1", "2.8:1")],
    ["a date value written out", withLine(0, FIRST)[0] + ""],
    ["the :1 of a ratio, since the template has it", FIRST]
  ])("allows %s", (_name, line) => {
    expect(matchesOf(withLine(0, line), "R1")).toEqual([]);
  });

  it("allows a date slot value as one token and rejects part of it", () => {
    expect(matchesOf(withLine(1, "Decision: {w1} (recorded 2026-10-28)"), "R1")).toEqual([]);
    expect(matchesOf(withLine(1, "Decision: {w1} (recorded 2026-10)"), "R1")).toEqual(["2026-10"]);
  });

  it("tells an id from digits: the 1 in an id is not a number, a bare 1 is judged on its own", () => {
    expect(matchesOf(withLine(0, "Detected: {L1} on {S1} {c1}"), "R1")).toEqual([]);
    expect(matchesOf(withLine(0, "Detected: {L1} on {S1} 2"), "R1")).toEqual(["2"]);
  });

  it("does not read a color code as a number", () => {
    expect(matchesOf(withLine(0, "Detected: {L1} on {S1} #9A9A9A"), "R1")).toEqual([]);
  });
});

describe("R2 hex", () => {
  it.each([
    ["a slot value", "#9A9A9A", false],
    ["a slot value in other case", "#9a9a9a", false],
    ["three digits", "#FFF", true],
    ["three digits that are digits", "#123", true],
    ["eight digits", "#12345678", true],
    ["nine digits", "#123456789", true],
    ["a different six", "#FF0000", true],
    ["two digits", "#12", false],
    ["not hex", "#GGG", false]
  ])("%s: %s", (_name, code, rejected) => {
    expect(matchesOf(withLine(0, `Detected: {L1} on {S1} ${code}`), "R2").length > 0).toBe(
      rejected
    );
  });
});

describe("R3 names", () => {
  it.each([
    ["a layer name", "Detected: the Helper text on {S1}", "Helper text"],
    ["a layer name in other case", "Detected: the HELPER TEXT on {S1}", "Helper text"],
    ["a screen name", "Detected: {L1} on Payment", "Payment"],
    ["a binding name", "Detected: {L1} on {S1} bound to text/muted", "text/muted"],
    ["a designer word", "Detected: {L1} on {S1}, a Brand color", "Brand color"]
  ])("rejects %s written out", (_name, line, match) => {
    expect(matchesOf(withLine(0, line), "R3")).toContain(match);
  });

  it.each([
    ["quoted text", 'Detected: {L1} on {S1} "Pay now"'],
    ["code text", "Detected: {L1} on {S1} `Pay now`"],
    ["curly quoted text", "Detected: {L1} on {S1} “Pay now”"]
  ])("rejects %s that is not an id", (_name, line) => {
    expect(matchesOf(withLine(0, line), "R3")).toEqual(["Pay now"]);
  });

  it("allows quotes around an id", () => {
    expect(matchesOf(withLine(0, 'Detected: "{L1}" on {S1}'), "R3")).toEqual([]);
  });

  it("documents the limit: an invented name with no quotes passes, and so does a short real name", () => {
    const invented = withLine(0, FIRST.replace("the text color", "the Checkout button text color"));
    expect(verifyModelOutput(invented, CTX)).toEqual({ ok: true, blocking: [], warnings: [] });
    const short = withLine(0, FIRST.replace("the text color", "the UI text color"));
    expect(verifyModelOutput(short, CTX).ok).toBe(true);
    expect(SLOTS.L2).toBe("UI");
  });
});

describe("R4 criteria", () => {
  it.each([
    ["a criterion number", "see 1.4.11", "1.4.11"],
    ["another criterion number", "see 2.5.8", "2.5.8"],
    ["a level", "at level AA", "AA"],
    ["the top level", "or AAA", "AAA"],
    ["a level written out", "Level AA", "Level AA"]
  ])("rejects %s", (_name, text, match) => {
    expect(matchesOf(withLine(0, `Detected: {L1} on {S1} ${text}`), "R4")).toContain(match);
  });

  it("allows what the criterion slot holds, as an id or written out", () => {
    expect(matchesOf(withLine(0, "Detected: {L1} on {S1} ({sc})"), "R4")).toEqual([]);
    expect(matchesOf(withLine(0, "Detected: {L1} on {S1} (WCAG 1.4.3)"), "R4")).toEqual([]);
    expect(matchesOf(withLine(0, "Detected: {L1} on {S1} (1.4.3)"), "R4")).toEqual([]);
  });

  it("rejects the standard's name when the block has no criterion slot", () => {
    const noCriterion = { templateLines: ["Detected: {L1} on {S1}"], slots: SLOTS };
    expect(rulesOf(["Detected: {L1} on {S1} for WCAG"], noCriterion)).toContain("R4");
  });
});

describe("R5 compliance claims", () => {
  it.each([
    "compliant",
    "Compliant",
    "complies",
    "comply",
    "compliance",
    "conforms",
    "conform",
    "conformance",
    "conformant",
    "passes",
    "passed",
    "meets",
    "meet",
    "fully accessible",
    "fully  accessible",
    "certified",
    "no issues",
    "all clear",
    "safe to ship"
  ])("rejects %s", (term) => {
    expect(rulesOf(withLine(0, `Detected: {L1} on {S1} ${term}`))).toContain("R5");
  });

  it.each([
    ["this meets the need", "meets"],
    ["it meets", "meets"],
    ["MEETS AA", "MEETS"],
    ["does not meet", "meet"]
  ])("rejects %s in any use", (text) => {
    expect(rulesOf(withLine(0, `Detected: {L1} on {S1} ${text}`))).toContain("R5");
  });

  it.each(["meetings", "passenger", "bypass", "complex", "compliment", "metadata", "issues"])(
    "does not mistake %s for a claim",
    (word) => {
      expect(matchesOf(withLine(0, `Detected: {L1} on {S1} ${word}`), "R5")).toEqual([]);
    }
  );
});
