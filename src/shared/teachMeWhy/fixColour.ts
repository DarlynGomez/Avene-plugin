import { rgbToHex } from "../colour/colorHex";
import { contrastRatio } from "../colour/contrastRatio";
import { parseHex } from "../colour/hexInput";
import { keepHue } from "../colour/keepHue";

/**
 * The colour the Keep your colour option in Adjust offers, the same search on the same inputs
 * Null when nothing of the same hue reaches the required ratio, so a fix is never made up
 */
export function sameHueFix(
  foregroundHex: string,
  backgroundHex: string,
  requiredRatio: number
): string | null {
  const foreground = parseHex(foregroundHex);
  const background = parseHex(backgroundHex);
  if (!foreground || !background) return null;
  const fix = keepHue(foreground, background, requiredRatio);
  return contrastRatio(fix, background) >= requiredRatio ? rgbToHex(fix) : null;
}
