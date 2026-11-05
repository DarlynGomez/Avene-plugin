import type { Headline } from "../../grouping/headline";

/**
 * The one line over the list, with the alt text layers that need a note added to the contrast issues
 * Unchanged when there are none, so a file with no images reads as it always did
 */
export function combineHeadline(
  headline: Headline,
  contrastScreenIds: ReadonlySet<string>,
  alt: { layers: number; screenIds: readonly string[] }
): Headline {
  if (alt.layers === 0) return headline;
  const contrast = headline.kind === "nothingOpen" ? 0 : headline.totalOpenCount;
  const screens = new Set([...contrastScreenIds, ...alt.screenIds]);
  return {
    kind: "unconcentrated",
    totalOpenCount: contrast + alt.layers,
    screenCount: screens.size
  };
}
