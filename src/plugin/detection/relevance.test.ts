import { describe, expect, it } from "vitest";

import { isPaintChange, isRelevantPropertyChange, isTextMove } from "./relevance";

describe("isRelevantPropertyChange", () => {
  it.each(["fills", "characters", "fontSize", "fontName", "visible", "opacity", "parent"])(
    "treats %s as relevant",
    (property) => {
      expect(isRelevantPropertyChange([property])).toBe(true);
    }
  );

  it.each(["x", "y", "width", "height", "rotation", "name"])(
    "does not treat %s as relevant on its own",
    (property) => {
      expect(isRelevantPropertyChange([property])).toBe(false);
    }
  );

  it("is relevant if any one property in a mixed batch matters", () => {
    expect(isRelevantPropertyChange(["x", "y", "fills"])).toBe(true);
  });

  it("is not relevant for an empty property list", () => {
    expect(isRelevantPropertyChange([])).toBe(false);
  });
});

describe("isPaintChange", () => {
  it.each(["fills", "visible", "opacity", "parent"])("is true for %s", (property) => {
    expect(isPaintChange([property])).toBe(true);
  });
  it.each(["x", "characters", "fontSize", "name"])("is false for %s", (property) => {
    expect(isPaintChange([property])).toBe(false);
  });
});

describe("isTextMove", () => {
  it.each(["x", "y", "width", "height", "relativeTransform"])("is true for %s", (property) => {
    expect(isTextMove([property])).toBe(true);
  });
  it.each(["fills", "characters", "name", "rotation"])("is false for %s", (property) => {
    expect(isTextMove([property])).toBe(false);
  });
});
