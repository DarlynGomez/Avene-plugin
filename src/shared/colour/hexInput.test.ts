import { describe, expect, it } from "vitest";

import { validateHexInput } from "./hexInput";

const WHITE = { r: 1, g: 1, b: 1 };

describe("validateHexInput", () => {
  it.each(["#000000", "000000", "#000", "000"])("accepts %s as black", (input) => {
    const result = validateHexInput(input, WHITE, 4.5);
    expect(result.kind).toBe("valid");
  });

  it.each(["#12345", "red", "#gggggg", "1234567", ""])("rejects %s as malformed", (input) => {
    expect(validateHexInput(input, WHITE, 4.5)).toEqual({ kind: "malformed" });
  });

  it("rejects a well formed hex that fails contrast, reporting the achieved ratio", () => {
    const result = validateHexInput("#eeeeee", WHITE, 4.5);
    expect(result.kind).toBe("fails-contrast");
    if (result.kind === "fails-contrast") {
      expect(result.achievedRatio).toBeLessThan(4.5 + 0.15);
      expect(result.requiredRatio).toBe(4.5);
    }
  });

  it("offers the nearest passing color on the same hue when one exists", () => {
    const result = validateHexInput("#dddddd", WHITE, 4.5);
    expect(result.kind).toBe("fails-contrast");
    if (result.kind === "fails-contrast") {
      expect(result.nearestOnHue).not.toBeNull();
    }
  });

  it("offers nothing when the hue cannot pass at any lightness", () => {
    const grey = { r: 0.5, g: 0.5, b: 0.5 };
    const result = validateHexInput("#808080", grey, 20);
    expect(result.kind).toBe("fails-contrast");
    if (result.kind === "fails-contrast") {
      expect(result.nearestOnHue).toBeNull();
    }
  });
});
