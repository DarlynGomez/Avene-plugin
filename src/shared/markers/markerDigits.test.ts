import { describe, expect, it } from "vitest";

import {
  GLYPH_HEIGHT,
  GLYPH_WIDTH,
  MAX_COUNT,
  countText,
  digitPath,
  glyphScale
} from "./markerDigits";
import { SHAPE_SIZE } from "./markerShape";

describe("countText", () => {
  it("is nothing for a layer with no related ones", () => {
    expect(countText(undefined)).toBeNull();
    expect(countText(0)).toBeNull();
    expect(countText(1)).toBeNull();
  });
  it("is the number for a group, up to 99, and 99+ beyond", () => {
    expect(countText(2)).toBe("2");
    expect(countText(14)).toBe("14");
    expect(countText(MAX_COUNT)).toBe("99");
    expect(countText(MAX_COUNT + 1)).toBe("99+");
  });
});

describe("digitPath", () => {
  it("draws every digit and the plus, each as at least one stroke", () => {
    for (const character of "0123456789+") {
      const { data } = digitPath(character, 1);
      expect(data.startsWith("M"), character).toBe(true);
    }
  });
  it("is as wide as its glyphs and the gaps between them, times the scale", () => {
    expect(digitPath("7", 2).width).toBe(GLYPH_WIDTH * 2);
    expect(digitPath("12", 1).width).toBe(GLYPH_WIDTH * 2 + 1.5);
    expect(digitPath("12", 1).height).toBe(GLYPH_HEIGHT);
  });
  it("puts the second character to the right of the first", () => {
    const one = digitPath("1", 1).data;
    const two = digitPath("11", 1).data;
    expect(two.startsWith(one)).toBe(true);
    expect(two.length).toBeGreaterThan(one.length);
  });
  it("keeps the numbers inside the middle of the narrowest shape, the triangle", () => {
    // A triangle in the box is about 0.58 of the width wide at the middle of the box
    const room = SHAPE_SIZE * 0.58;
    for (const text of ["2", "9", "10", "99", "99+"]) {
      const path = digitPath(text, glyphScale([...text].length));
      expect(path.width, text).toBeLessThanOrEqual(room + 0.5);
      expect(path.height, text).toBeLessThanOrEqual(SHAPE_SIZE * 0.6);
    }
  });
});
