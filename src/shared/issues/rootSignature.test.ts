import { describe, expect, it } from "vitest";

import { buildRootSignature, parseRootSignature } from "./rootSignature";

describe("buildRootSignature", () => {
  it("joins the four parts with pipes", () => {
    expect(
      buildRootSignature({
        foregroundHex: "#9CB5B1",
        backgroundHex: "#FFFFFF",
        foregroundBinding: "sage/muted",
        requiredRatio: 4.5
      })
    ).toBe("#9CB5B1|#FFFFFF|sage/muted|4.5");
  });

  it("records an unbound foreground as the literal 'unbound'", () => {
    expect(
      buildRootSignature({
        foregroundHex: "#888888",
        backgroundHex: "#EEEEEE",
        foregroundBinding: null,
        requiredRatio: 3
      })
    ).toBe("#888888|#EEEEEE|unbound|3");
  });

  it("produces different signatures for the same colors at different required ratios", () => {
    const normal = buildRootSignature({
      foregroundHex: "#E8644A",
      backgroundHex: "#FDF0ED",
      foregroundBinding: "coral/craving",
      requiredRatio: 4.5
    });
    const large = buildRootSignature({
      foregroundHex: "#E8644A",
      backgroundHex: "#FDF0ED",
      foregroundBinding: "coral/craving",
      requiredRatio: 3
    });
    expect(normal).not.toBe(large);
  });
});

describe("parseRootSignature", () => {
  it("round-trips a bound signature", () => {
    const signature = buildRootSignature({
      foregroundHex: "#9CB5B1",
      backgroundHex: "#FFFFFF",
      foregroundBinding: "sage/muted",
      requiredRatio: 4.5
    });
    expect(parseRootSignature(signature)).toEqual({
      foregroundHex: "#9CB5B1",
      backgroundHex: "#FFFFFF",
      foregroundBinding: "sage/muted",
      requiredRatio: 4.5
    });
  });

  it("round-trips an unbound signature back to a null binding", () => {
    const signature = buildRootSignature({
      foregroundHex: "#888888",
      backgroundHex: "#EEEEEE",
      foregroundBinding: null,
      requiredRatio: 3
    });
    expect(parseRootSignature(signature)?.foregroundBinding).toBeNull();
  });

  it("round-trips a binding name that itself contains the separator", () => {
    const signature = buildRootSignature({
      foregroundHex: "#111111",
      backgroundHex: "#FFFFFF",
      foregroundBinding: "weird|name",
      requiredRatio: 4.5
    });
    expect(parseRootSignature(signature)).toEqual({
      foregroundHex: "#111111",
      backgroundHex: "#FFFFFF",
      foregroundBinding: "weird|name",
      requiredRatio: 4.5
    });
  });

  it("returns null for a signature missing a field", () => {
    expect(parseRootSignature("#111111|#FFFFFF|4.5")).toBeNull();
  });

  it("returns null for a signature with no separators at all", () => {
    expect(parseRootSignature("not-a-signature")).toBeNull();
  });

  it("returns null when the required ratio segment is not a number", () => {
    expect(parseRootSignature("#111111|#FFFFFF|sage/muted|not-a-number")).toBeNull();
  });

  it("returns null when the background hex segment is empty", () => {
    expect(parseRootSignature("#111111||sage/muted|4.5")).toBeNull();
  });
});
