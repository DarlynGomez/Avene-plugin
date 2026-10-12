import type { RGBColor } from "../issues/issueTypes";
import { contrastRatio, relativeLuminance } from "./contrastRatio";
import { CONTRAST_ADJUST_HEADROOM } from "./headroom";
import { hslToRgb, rgbToHsl } from "./hsl";

const SEARCH_STEPS = 40;

type Side = "darker" | "lighter";

/**
 * Least lightness change on the same hue that passes, searching the side that usually helps first
 * White text on a mid orange is the case for the other side: nothing lighter than white exists, so
 * the only passing colours are darker ones, and the side is tried when the first one cannot pass
 */
export function keepHue(current: RGBColor, background: RGBColor, requiredRatio: number): RGBColor {
  const target = requiredRatio + CONTRAST_ADJUST_HEADROOM;
  if (contrastRatio(current, background) >= target) {
    return current;
  }

  const { h, s, l } = rgbToHsl(current);
  const passes = (lightness: number): boolean =>
    contrastRatio(hslToRgb(h, s, lightness), background) >= target;

  function search(side: Side): { found: boolean; color: RGBColor } {
    let passLightness = side === "darker" ? 0 : 1;
    let failLightness = l;
    if (!passes(passLightness)) {
      return { found: false, color: hslToRgb(h, s, passLightness) };
    }
    for (let step = 0; step < SEARCH_STEPS; step += 1) {
      const mid = (passLightness + failLightness) / 2;
      if (passes(mid)) {
        passLightness = mid;
      } else {
        failLightness = mid;
      }
    }
    return { found: true, color: hslToRgb(h, s, passLightness) };
  }

  const usual: Side =
    relativeLuminance(current) <= relativeLuminance(background) ? "darker" : "lighter";
  const first = search(usual);
  if (first.found) {
    return first.color;
  }
  const other = search(usual === "darker" ? "lighter" : "darker");
  return other.found ? other.color : first.color;
}
