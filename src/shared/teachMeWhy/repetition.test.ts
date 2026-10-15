import { describe, expect, it } from "vitest";
import { findRepeats } from "./repetition";

const clean = {
  1: "{foreground} on {background} measures {measured}, below the {required} this {fontsize} text needs. Darkening it to about {fix} keeps the hue.",
  2: "Where a screen is read matters. In one study the group that saw colours least accurately was older and more likely to be outdoors.",
  3: "Contrast is a limit on how close two lightnesses can be, and a limit is something you design inside, not around."
} as const;

describe("findRepeats", () => {
  it("finds nothing in three depths that each do their own job", () => {
    expect(findRepeats(clean)).toEqual([]);
  });
  it("finds a shared opening, naming the later depth", () => {
    const repeats = findRepeats({
      ...clean,
      2: "Darkening it to about the same shade is easy. Other words follow here.",
      3: "Darkening it to about the same shade is cheap. A different claim follows."
    });
    expect(repeats).toContainEqual({ depth: 3, other: 2, why: "same opening" });
  });
  it("finds a sentence that appears in two depths", () => {
    const repeats = findRepeats({ ...clean, 3: `${clean[3]} Where a screen is read matters.` });
    expect(repeats).toContainEqual({ depth: 3, other: 2, why: "same sentence" });
  });
  it("finds the same main claim in different words", () => {
    const repeats = findRepeats({
      ...clean,
      2: "Pale text fails readers outdoors because glare washes out thin strokes.",
      3: "Glare washes out thin strokes, so pale text fails readers outdoors."
    });
    expect(repeats).toContainEqual({ depth: 3, other: 2, why: "same main claim" });
  });
  it("ignores placeholders when comparing and flags a depth that opens with a ratio", () => {
    const repeats = findRepeats({
      ...clean,
      2: "{measured} is the number in play here for this text."
    });
    expect(repeats).toContainEqual({ depth: 2, other: 1, why: "opens with a ratio" });
  });
});
