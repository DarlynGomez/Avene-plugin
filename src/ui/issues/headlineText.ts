import type { Headline } from "../../shared/grouping/headline";

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}

/** The three headline shapes as the exact copy */
export function formatHeadline(headline: Headline): string {
  if (headline.kind === "nothingOpen") {
    return `Nothing open. ${headline.decidedRootCount} ${plural(headline.decidedRootCount, "decision")} recorded.`;
  }

  if (headline.kind === "unconcentrated") {
    return `${headline.totalOpenCount} ${plural(headline.totalOpenCount, "issue")} across ${headline.screenCount} ${plural(headline.screenCount, "screen")}.`;
  }

  const coveredCount = headline.bindings.reduce((sum, entry) => sum + entry.openCount, 0);
  const colorCount = headline.bindings.length;
  const verb = colorCount === 1 ? "causes" : "cause";
  return `${colorCount} ${plural(colorCount, "color")} ${verb} ${coveredCount} of ${headline.totalOpenCount} issues.`;
}

/** Count pill on the Live Watch tab, open findings only */
export function openCountFromHeadline(headline: Headline): number {
  return headline.kind === "nothingOpen" ? 0 : headline.totalOpenCount;
}
