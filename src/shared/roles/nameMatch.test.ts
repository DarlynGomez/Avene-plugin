import { describe, expect, it } from "vitest";
import { matchedPattern, normalizeName } from "./nameMatch";

describe("normalizeName", () => {
  it("lower cases, splits at punctuation and at a lower to upper case change", () => {
    expect(normalizeName("Card_Title-2")).toBe(" card title 2 ");
    expect(normalizeName("primaryBtn")).toBe(" primary btn ");
    expect(normalizeName("A1.card1.button.label")).toBe(" a1 card1 button label ");
  });
});

describe("matchedPattern", () => {
  it("matches a whole word and a whole phrase", () => {
    expect(matchedPattern("Background Text", ["background text"])).toBe("background text");
    expect(matchedPattern("h1", ["h1", "h2"])).toBe("h1");
  });
  it("does not match inside a longer word", () => {
    expect(matchedPattern("subtitle", ["title"])).toBeNull();
    expect(matchedPattern("h10", ["h1"])).toBeNull();
    expect(matchedPattern("background", ["background text"])).toBeNull();
  });
});
