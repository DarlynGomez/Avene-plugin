import { describe, expect, it } from "vitest";

import {
  LEGACY_MARKER_LABEL_PATTERN,
  MARKER_LABEL_PATTERN,
  isMarkerLabel,
  markerLabel
} from "./markerLabel";

const base = { measuredRatio: 2.17, requiredRatio: 4.5, important: false, layersHere: 1 };

describe("markerLabel", () => {
  it("is the measured ratio to one decimal and nothing else", () => {
    expect(markerLabel(base)).toBe("2.2");
    expect(markerLabel({ ...base, measuredRatio: 3.04 })).toBe("3.0");
    expect(markerLabel({ ...base, measuredRatio: 12.65 })).toBe("12.7");
  });

  it("adds x and the count when the root has several layers on this screen", () => {
    expect(markerLabel({ ...base, layersHere: 2 })).toBe("2.2 x2");
    expect(markerLabel({ ...base, layersHere: 12 })).toBe("2.2 x12");
  });

  it("adds nothing for one layer or none", () => {
    expect(markerLabel({ ...base, layersHere: 1 })).toBe("2.2");
    expect(markerLabel({ ...base, layersHere: 0 })).toBe("2.2");
  });

  it("starts with an exclamation mark for an important root", () => {
    expect(markerLabel({ ...base, important: true })).toBe("! 2.2");
    expect(markerLabel({ ...base, important: true, layersHere: 3 })).toBe("! 2.2 x3");
  });

  it("has no words, no required ratio and no sentence", () => {
    const label = markerLabel({ ...base, important: true, layersHere: 3 });

    expect(label).not.toMatch(/[A-Za-z]{2,}/);
    expect(label).not.toContain("4.5");
    expect(label).not.toContain(",");
    expect(label.length).toBeLessThanOrEqual(10);
  });

  it("never rounds a failing ratio up to the number that is needed", () => {
    expect(markerLabel({ ...base, measuredRatio: 4.46, requiredRatio: 4.5 })).toBe("4.4");
    expect(markerLabel({ ...base, measuredRatio: 2.96, requiredRatio: 3 })).toBe("2.9");
    expect(markerLabel({ ...base, measuredRatio: 6.97, requiredRatio: 7 })).toBe("6.9");
  });

  it("still rounds normally when the rounded number stays under what is needed", () => {
    expect(markerLabel({ ...base, measuredRatio: 4.34, requiredRatio: 4.5 })).toBe("4.3");
    expect(markerLabel({ ...base, measuredRatio: 4.35, requiredRatio: 4.5 })).toBe("4.4");
  });

  it("carries no dash or symbol other than the exclamation mark", () => {
    const label = markerLabel({ ...base, important: true, layersHere: 12 });

    expect(label).not.toMatch(new RegExp("[\\u2013\\u2014\\u2022]"));
  });
});

describe("the label patterns, the one source of truth for recognising a marker", () => {
  it.each([
    markerLabel({ measuredRatio: 2.17, requiredRatio: 4.5, important: false, layersHere: 1 }),
    markerLabel({ measuredRatio: 2.17, requiredRatio: 4.5, important: false, layersHere: 4 }),
    markerLabel({ measuredRatio: 2.17, requiredRatio: 4.5, important: true, layersHere: 1 }),
    markerLabel({ measuredRatio: 21, requiredRatio: 4.5, important: true, layersHere: 11 })
  ])("matches every label it produces: %s", (label) => {
    expect(MARKER_LABEL_PATTERN.test(label)).toBe(true);
    expect(isMarkerLabel(label)).toBe(true);
  });

  it.each(["", "Note", "2", "2.25", "x2", "2.2 x", "Spacing 2.2", "2.2 layers", "!2.2", " 2.2"])(
    "does not match a designer's text: %j",
    (label) => {
      expect(isMarkerLabel(label)).toBe(false);
    }
  );

  it("also recognises the earlier long format, kept apart from the current one", () => {
    expect(LEGACY_MARKER_LABEL_PATTERN.test("Contrast 2.17, needs 4.5")).toBe(true);
    expect(
      LEGACY_MARKER_LABEL_PATTERN.test("Important. Contrast 2.17, needs 4.5. 3 layers here")
    ).toBe(true);
    expect(MARKER_LABEL_PATTERN.test("Contrast 2.17, needs 4.5")).toBe(false);
    expect(isMarkerLabel("Contrast 2.17, needs 4.5")).toBe(true);
  });
});
