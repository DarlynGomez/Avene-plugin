import { rgbToHex } from "../colour/colorHex";
import { contrastRatio } from "../colour/contrastRatio";
import { parseHex } from "../colour/hexInput";
import { keepHue } from "../colour/keepHue";
import { formatRatio } from "./text";

export interface ColorSuggestion {
  hex: string;
  /** Cut like every ratio in a document, so it never reads as more than it is */
  ratio: string;
}

/**
 * The text color on the same hue that is closest to the current one and reaches the required ratio
 * Null when the colors cannot be read or nothing on that hue reaches it, a name for a token is not known here
 */
export function suggestColor(
  foregroundHex: string,
  backgroundHex: string,
  requiredRatio: number
): ColorSuggestion | null {
  const foreground = parseHex(foregroundHex);
  const background = parseHex(backgroundHex);
  if (!foreground || !background) return null;
  const color = keepHue(foreground, background, requiredRatio);
  const ratio = contrastRatio(color, background);
  const hex = rgbToHex(color);
  if (ratio < requiredRatio || hex === rgbToHex(foreground)) return null;
  return { hex, ratio: formatRatio(ratio) };
}
