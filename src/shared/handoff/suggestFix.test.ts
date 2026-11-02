import { describe, expect, it } from "vitest";

import { contrastRatio } from "../colour/contrastRatio";
import { parseHex } from "../colour/hexInput";
import { suggestColor } from "./suggestFix";

function ratioOf(hex: string, background: string): number {
  const a = parseHex(hex);
  const b = parseHex(background);
  if (!a || !b) throw new Error("not a color");
  return contrastRatio(a, b);
}

describe("suggestColor", () => {
  it("gives a color on the same hue that reaches the ratio, with its cut ratio", () => {
    const fix = suggestColor("#9A9A9A", "#FFFFFF", 4.5);
    expect(fix).not.toBeNull();
    const ratio = ratioOf(fix?.hex ?? "", "#FFFFFF");
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(Number(fix?.ratio)).toBeLessThanOrEqual(ratio);
  });

  it("goes darker for white text on orange, since nothing lighter exists", () => {
    const fix = suggestColor("#FFFFFF", "#FF7A1A", 4.5);
    expect(fix).not.toBeNull();
    expect(ratioOf(fix?.hex ?? "", "#FF7A1A")).toBeGreaterThanOrEqual(4.5);
  });

  it("has nothing to suggest when the color already passes, or a color cannot be read", () => {
    expect(suggestColor("#000000", "#FFFFFF", 4.5)).toBeNull();
    expect(suggestColor("nope", "#FFFFFF", 4.5)).toBeNull();
    expect(suggestColor("#9A9A9A", "", 4.5)).toBeNull();
  });
});
