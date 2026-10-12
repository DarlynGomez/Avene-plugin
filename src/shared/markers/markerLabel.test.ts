import { describe, expect, it } from "vitest";

import { markerLabel } from "./markerLabel";

const base = { measuredRatio: 2.17, requiredRatio: 4.5, important: false, layersHere: 1 };

describe("markerLabel", () => {
  it("is a short neutral measurement", () => {
    expect(markerLabel(base)).toBe("Contrast 2.17, needs 4.5");
  });

  it("adds the layer count when the root has several on this screen", () => {
    expect(markerLabel({ ...base, layersHere: 3 })).toBe("Contrast 2.17, needs 4.5. 3 layers here");
  });

  it("says nothing about layers for one", () => {
    expect(markerLabel({ ...base, layersHere: 1 })).not.toContain("layers");
    expect(markerLabel({ ...base, layersHere: 0 })).not.toContain("layers");
  });

  it("leads with the word Important for an important root", () => {
    expect(markerLabel({ ...base, important: true })).toBe("Important. Contrast 2.17, needs 4.5");
  });

  it("combines important and several layers", () => {
    expect(markerLabel({ ...base, important: true, layersHere: 2 })).toBe(
      "Important. Contrast 2.17, needs 4.5. 2 layers here"
    );
  });

  it("cuts the measured ratio and never rounds it up to a passing look", () => {
    expect(markerLabel({ ...base, measuredRatio: 4.499 })).toBe("Contrast 4.49, needs 4.5");
    expect(markerLabel({ ...base, measuredRatio: 2.179 })).toBe("Contrast 2.17, needs 4.5");
    expect(markerLabel({ ...base, measuredRatio: 2.17 })).toBe("Contrast 2.17, needs 4.5");
  });

  it("shows two decimals on the measurement and no trailing zero on the requirement", () => {
    expect(markerLabel({ ...base, measuredRatio: 3, requiredRatio: 3 })).toBe(
      "Contrast 3.00, needs 3"
    );
    expect(markerLabel({ ...base, requiredRatio: 7 })).toBe("Contrast 2.17, needs 7");
  });

  it("carries no dash or symbol and stays short", () => {
    const label = markerLabel({ ...base, important: true, layersHere: 12 });

    expect(label).not.toMatch(new RegExp("[\\u2013\\u2014\\u2022]"));
    expect(label.length).toBeLessThan(70);
  });
});
