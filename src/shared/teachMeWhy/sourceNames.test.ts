import { describe, expect, it } from "vitest";
import { sourceNamesFor } from "./sourceNames";

describe("sourceNamesFor", () => {
  it("names each source once, in the order they first appear", () => {
    expect(sourceNamesFor(["F01", "F03"])).toEqual([
      "WebAIM Contrast and Color Accessibility",
      "W3C"
    ]);
    expect(sourceNamesFor(["F15", "F01"])).toEqual([
      "WebAIM, The WebAIM Million 2026",
      "WebAIM Contrast and Color Accessibility",
      "W3C"
    ]);
  });
  it("gives nothing when no facts were used or an id is unknown", () => {
    expect(sourceNamesFor([])).toEqual([]);
    expect(sourceNamesFor(["F99"])).toEqual([]);
  });
});
