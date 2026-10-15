import { describe, expect, it } from "vitest";
import { sourceNamesFor } from "./sourceNames";

describe("sourceNamesFor", () => {
  it("names each source once, in the order they first appear", () => {
    const w3c = "World Wide Web Consortium (W3C), Contrast (Minimum)";
    expect(sourceNamesFor(["F01", "F03"])).toEqual([w3c]);
    expect(sourceNamesFor(["F15", "F01", "F05"])).toEqual([
      "WebAIM, The WebAIM Million 2026",
      w3c,
      "WebAIM, Contrast and Color Accessibility"
    ]);
  });
  it("gives nothing when no facts were used or an id is unknown", () => {
    expect(sourceNamesFor([])).toEqual([]);
    expect(sourceNamesFor(["F99"])).toEqual([]);
  });
});
