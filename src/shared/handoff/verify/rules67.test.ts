import { describe, expect, it } from "vitest";

import { CLIENT_LINE, HIGHER_UP_LINE, NOT_COVERED_LINE } from "../fixedLines";
import { verifyEdit, verifyModelOutput } from "./verifyBlock";
import { substituteIds } from "./substitute";
import { CTX, GOOD, SLOTS, withLine } from "./verifyFixtures";

const detail = (sentences: unknown) =>
  verifyModelOutput(sentences, CTX)
    .blocking.filter((v) => v.rule === "R6")
    .map((v) => `${v.detail}: ${v.match}`);

describe("R6 labels", () => {
  it("passes lines in another order", () => {
    expect(verifyModelOutput([GOOD[2], GOOD[0], GOOD[1]], CTX).ok).toBe(true);
  });

  it("passes ids swapped between two lines of the same label, which is the limit of a multiset", () => {
    const ctx = {
      templateLines: ["Decision: {w1}", "Decision: {w2}"],
      slots: SLOTS
    };
    expect(verifyModelOutput(["Decision: {w2}", "Decision: {w1}"], ctx).ok).toBe(true);
  });

  it("rejects a dropped label", () => {
    expect(detail([GOOD[0], GOOD[2]])).toEqual(["A label was dropped: Decision"]);
  });

  it("rejects an added label, one the template never had", () => {
    expect(detail([...GOOD, "Needs check: Something else"])).toEqual([
      "A label was added: Needs check"
    ]);
  });

  it("rejects a label that was changed, and the ids that moved with it", () => {
    expect(detail(withLine(1, "Detected: {w1} (recorded {d1})"))).toEqual([
      "The ids under a label changed: Detected",
      "A label was dropped: Decision"
    ]);
  });

  it("rejects an owner that was changed", () => {
    expect(detail(withLine(2, "Needs check (owner: Dev): {w2}"))).toEqual([
      "A label was dropped: Needs check (owner: PM)",
      "A label was added: Needs check (owner: Dev)"
    ]);
  });

  it("rejects an id dropped from a line, one added, and one repeated", () => {
    expect(detail(withLine(1, "Decision: {w1}"))).toEqual([
      "The ids under a label changed: Decision"
    ]);
    expect(detail(withLine(1, "Decision: {w1} (recorded {d1}) {w2}"))).toEqual([
      "The ids under a label changed: Decision"
    ]);
    expect(detail(withLine(1, "Decision: {w1} {w1} (recorded {d1})"))).toEqual([
      "The ids under a label changed: Decision"
    ]);
  });

  it("rejects a line with no label and a label in the wrong case", () => {
    expect(detail([...GOOD, "Just some words"])).toEqual(["A line with no label: Just some words"]);
    expect(detail(withLine(1, "decision: {w1} (recorded {d1})"))[0]).toContain(
      "A line with no label"
    );
  });
});

describe("R7 structure", () => {
  it.each([
    ["not an array", "text"],
    ["null", null],
    ["an empty list", []],
    ["a number in the list", [GOOD[0], 4]],
    ["an object", { sentences: GOOD }]
  ])("rejects a reply that is %s", (_name, raw) => {
    const result = verifyModelOutput(raw, CTX);
    expect(result.ok).toBe(false);
    expect(result.blocking.map((v) => v.rule)).toEqual(["R7"]);
  });

  it("rejects an empty sentence", () => {
    expect(verifyModelOutput([...GOOD, "   "], CTX).blocking.map((v) => v.detail)).toContain(
      "An empty sentence"
    );
  });

  it("rejects an id the block does not have, even one the document has", () => {
    const bad = withLine(0, GOOD[0].replace("{S1}", "{zz}"));
    expect(verifyModelOutput(bad, CTX).blocking.map((v) => v.detail)).toContain(
      "An id this block does not have"
    );
    expect(
      verifyModelOutput(withLine(0, GOOD[0] + " {nope9}"), CTX).blocking.map((v) => v.match)
    ).toContain("nope9");
  });

  it("rejects a stray brace", () => {
    const result = verifyModelOutput(withLine(0, GOOD[0] + " { L1 }"), CTX);
    expect(result.blocking.map((v) => v.detail)).toContain("A stray brace");
  });

  it.each([
    ["the not covered line", NOT_COVERED_LINE],
    ["the not covered line without its label", NOT_COVERED_LINE.replace("Needs check: ", "")],
    ["the client line", CLIENT_LINE],
    ["the higher-up line", HIGHER_UP_LINE.toUpperCase()]
  ])("rejects %s inside a sentence", (_name, fixed) => {
    const result = verifyModelOutput(withLine(2, `Needs check (owner: PM): {w2} ${fixed}`), CTX);
    expect(result.blocking.map((v) => v.detail)).toContain("A fixed line written into a sentence");
  });
});

describe("an edit of filled text", () => {
  const filled = (lines: readonly string[]) => {
    const out = substituteIds(lines, SLOTS);
    if (!out.ok) throw new Error("unknown ids");
    return out.lines;
  };
  const edit = (lines: string[]) => verifyEdit(lines, CTX);

  it("passes the filled-in rewrite with no warnings, names and all", () => {
    expect(edit(filled(GOOD))).toEqual({ ok: true, blocking: [], warnings: [] });
  });

  it("does not flag the designer's own words that were filled in", () => {
    const slots = { ...SLOTS, w1: "Meets brand rules, 3 of them, #FF0000" };
    const out = substituteIds(GOOD, slots);
    if (!out.ok) throw new Error("unknown ids");
    expect(verifyEdit(out.lines, { ...CTX, slots }).ok).toBe(true);
  });

  it.each([
    ["a digit run", "R1", (l: string) => l.replace("share the pair", "share the pair, 7 times")],
    ["any digit run, such as a date", "R1", (l: string) => l.replace("share", "from 2026 share")],
    ["a color code", "R2", (l: string) => l.replace("share the pair", "share #FF0000")],
    ["a claim", "R5", (l: string) => l.replace("share the pair", "are compliant")]
  ])("blocks %s", (_name, rule, change) => {
    const lines = filled(GOOD);
    lines[0] = change(lines[0]);
    const result = edit(lines);
    expect(result.ok).toBe(false);
    expect(result.blocking.map((v) => v.rule)).toContain(rule);
  });

  it.each([
    ["an invented quoted name", "R3", (l: string[]) => [l[0] + ' "Pay now"', l[1], l[2]]],
    ["an invented criterion level", "R4", (l: string[]) => [l[0] + " at AA", l[1], l[2]]],
    ["a dropped label", "R6", (l: string[]) => [l[0], l[2]]],
    ["a line with no label", "R6", (l: string[]) => [...l, "Unlabeled words"]],
    ["an empty sentence", "R7", (l: string[]) => [...l, " "]]
  ])("only warns for %s", (_name, rule, change) => {
    const result = edit(change(filled(GOOD)));
    expect(result.ok).toBe(true);
    expect(result.blocking).toEqual([]);
    expect(result.warnings.map((v) => v.rule)).toContain(rule);
  });

  it("allows a quoted layer name that was filled in", () => {
    const result = edit(
      filled(
        withLine(
          0,
          'Detected: "{L1}" on {S1}: {fg1} on {bg1} {r1}:1 {q1}:1 ({sc}) {c1} layers {b1}'
        )
      )
    );
    expect(result.warnings.filter((v) => v.rule === "R3")).toEqual([]);
  });
});

describe("substituteIds", () => {
  it("puts values back for ids", () => {
    expect(substituteIds(['"{L1}" on {S1}'], SLOTS)).toEqual({
      ok: true,
      lines: ['"Helper text" on Payment']
    });
  });

  it("refuses the whole block on an unknown id and names it", () => {
    expect(substituteIds(["{L1} {nope}", "{other}"], SLOTS)).toEqual({
      ok: false,
      unknown: ["nope", "other"]
    });
  });

  it("is not fooled by names from the object prototype", () => {
    expect(substituteIds(["{constructor} {toString}"], SLOTS)).toEqual({
      ok: false,
      unknown: ["constructor", "toString"]
    });
  });

  it("leaves braces that are not ids alone", () => {
    expect(substituteIds(["{ L1 } and {}"], SLOTS)).toEqual({ ok: true, lines: ["{ L1 } and {}"] });
  });
});
