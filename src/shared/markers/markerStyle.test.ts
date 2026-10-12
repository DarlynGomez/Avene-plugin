import { describe, expect, it } from "vitest";

import { MARKER_STYLE, MARKER_STYLES } from "./markerStyle";

describe("the marker style", () => {
  it("is a dot, chosen after the comparison", () => {
    expect(MARKER_STYLE).toBe("dot");
  });

  it("is one the renderer can draw, and the other two are still there to go back to", () => {
    expect(MARKER_STYLES).toEqual(["annotation", "dot", "ring"]);
    expect(MARKER_STYLES).toContain(MARKER_STYLE);
  });
});
