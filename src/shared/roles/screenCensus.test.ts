import { describe, expect, it } from "vitest";
import { sizeRatio, screenBodyPx } from "./screenCensus";
import { taskALayers } from "./testing/taskLayers";

const entries = (screen: string) =>
  taskALayers()
    .filter((row) => row.screen === screen)
    .map((row) => ({ fontSizePx: row.sizePx, charCount: row.text.length }));

describe("screenBodyPx", () => {
  it("is the size with the most characters on the real screens", () => {
    // A1 has 113 characters at 14px, 75 at 16px, 54 at 12px
    expect(screenBodyPx(entries("A1"))).toBe(14);
    // A2 has 53 characters at 16px, 43 at 12px
    expect(screenBodyPx(entries("A2"))).toBe(16);
  });
  it("gives a tie to the smaller size", () => {
    const tie = [
      { fontSizePx: 16, charCount: 30 },
      { fontSizePx: 14, charCount: 30 },
      { fontSizePx: 12, charCount: 10 },
      { fontSizePx: 24, charCount: 10 }
    ];
    expect(screenBodyPx(tie)).toBe(14);
  });
  it("needs 4 text nodes and 80 characters, and not one fewer", () => {
    const four = [
      { fontSizePx: 14, charCount: 50 },
      { fontSizePx: 14, charCount: 10 },
      { fontSizePx: 16, charCount: 10 },
      { fontSizePx: 12, charCount: 10 }
    ];
    expect(screenBodyPx(four)).toBe(14);
    expect(screenBodyPx(four.slice(1))).toBeNull();
    expect(screenBodyPx([{ ...four[0], charCount: 49 }, ...four.slice(1)])).toBeNull();
    expect(screenBodyPx([])).toBeNull();
  });
  it("ignores a node whose size is mixed when choosing, but still counts it", () => {
    const mixed = [
      { fontSizePx: null, charCount: 200 },
      { fontSizePx: 14, charCount: 10 },
      { fontSizePx: 16, charCount: 5 },
      { fontSizePx: 12, charCount: 5 }
    ];
    expect(screenBodyPx(mixed)).toBe(14);
  });
});

describe("sizeRatio", () => {
  it("divides by the main size, and is null when there is nothing to divide by", () => {
    expect(sizeRatio(21, entries("A1"))).toBe(1.5);
    expect(sizeRatio(null, entries("A1"))).toBeNull();
    expect(sizeRatio(14, [])).toBeNull();
  });
});
