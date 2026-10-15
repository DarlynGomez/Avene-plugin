import type { ScreenTextEntry } from "./roleInputs";

const MIN_TEXT_NODES = 4;
const MIN_CHARACTERS = 80;

/**
 * The font size that carries the most characters on the screen, a tie going to the smaller size
 * Null unless the screen has enough text to say what the main text is
 */
export function screenBodyPx(census: readonly ScreenTextEntry[]): number | null {
  const sized = census.filter((entry) => entry.fontSizePx !== null);
  const total = census.reduce((sum, entry) => sum + entry.charCount, 0);
  if (census.length < MIN_TEXT_NODES || total < MIN_CHARACTERS) return null;
  const bySize = new Map<number, number>();
  for (const entry of sized) {
    const size = entry.fontSizePx as number;
    bySize.set(size, (bySize.get(size) ?? 0) + entry.charCount);
  }
  let best: number | null = null;
  for (const [size, chars] of [...bySize.entries()].sort((a, b) => a[0] - b[0])) {
    if (best === null || chars > (bySize.get(best) ?? 0)) best = size;
  }
  return best;
}

/** How much larger or smaller than the main text this node is, null when there is nothing to compare */
export function sizeRatio(
  fontSizePx: number | null,
  census: readonly ScreenTextEntry[]
): number | null {
  const body = screenBodyPx(census);
  return fontSizePx === null || body === null || body === 0 ? null : fontSizePx / body;
}
