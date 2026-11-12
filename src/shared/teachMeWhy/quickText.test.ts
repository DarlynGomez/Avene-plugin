import { describe, expect, it } from "vitest";

import { ELEMENT_ROLES } from "./explanationTypes";
import {
  checkQuickParts,
  composeQuickText,
  plainWords,
  QUICK_KEYS,
  type QuickParts
} from "./quickText";

function validParts(): QuickParts {
  const keys = Object.fromEntries(
    QUICK_KEYS.map((key) => [
      key,
      { headline: "Move the colors apart.", bullets: ["Make the lighter color lighter."] }
    ])
  );
  return { version: 3, keys };
}

function withText(headline: string, bullets: string[] = []): QuickParts {
  const parts = validParts();
  parts.keys[QUICK_KEYS[0]] = { headline, bullets };
  return parts;
}

describe("the Quick keys", () => {
  it("are the 42 depth 1 keys of the repo, one per role, severity and size", () => {
    expect(QUICK_KEYS).toHaveLength(ELEMENT_ROLES.length * 3 * 2);
    expect(QUICK_KEYS.every((key) => key.endsWith(":1"))).toBe(true);
    expect(new Set(QUICK_KEYS).size).toBe(QUICK_KEYS.length);
  });
});

describe("composeQuickText and plainWords", () => {
  it("joins the headline, a blank line, and one dashed bullet per line", () => {
    expect(composeQuickText({ headline: "Head.", bullets: ["One.", "Two."] })).toBe(
      "Head.\n\n- One.\n- Two."
    );
    expect(composeQuickText({ headline: "Head.", bullets: [] })).toBe("Head.");
  });
  it("does not count the list markers as words", () => {
    expect(plainWords("Head here.\n\n- One two.\n- Three.")).toBe(5);
  });
});

describe("checkQuickParts", () => {
  it("accepts a complete file", () => {
    expect(checkQuickParts(validParts())).toEqual([]);
  });
  it.each([
    ["a wrong version", { ...validParts(), version: 2 }],
    [
      "a missing key",
      (() => {
        const parts = validParts();
        parts.keys = Object.fromEntries(Object.entries(parts.keys).slice(1));
        return parts;
      })()
    ],
    [
      "an extra key",
      (() => {
        const parts = validParts();
        parts.keys["heading:low:normal:2"] = { headline: "Move.", bullets: [] };
        return parts;
      })()
    ],
    ["a slot", withText("Move {measured} apart.")],
    ["a digit", withText("Move 2 colors apart.")],
    ["the word ratio", withText("Move the ratio apart.")],
    ["the word level", withText("Move to the next level.")],
    ["WCAG", withText("Move per WCAG.")],
    ["an em dash", withText("Move the colors — apart.")],
    ["an en dash", withText("Move the colors – apart.")],
    ["a curly quote", withText("Move the “colors” apart.")],
    ["a UK spelling", withText("Move the colour apart.")],
    ["bold", withText("Move it.", ["Try a bold weight."])],
    ["Adjust", withText("Move it.", ["Try Adjust."])],
    ["Ignore", withText("Move it.", ["You may Ignore it."])],
    ["Defer", withText("Move it.", ["You can Defer it."])],
    ["four bullets", withText("Move it.", ["a", "b", "c", "d"])],
    ["a bullet over 18 words", withText("Move it.", [Array(19).fill("word").join(" ")])],
    ["a sentence over 30 words", withText(`${Array(31).fill("word").join(" ")}.`)]
  ])("refuses %s", (_name, parts) => {
    expect(checkQuickParts(parts).length).toBeGreaterThan(0);
  });
  it("does not mistake decoration for the word ratio", () => {
    expect(checkQuickParts(withText("Avene reads this as decoration."))).toEqual([]);
  });
});
