import { CRITERION_PATTERNS } from "./data/criterionPatterns";
import { CRITERION_SLOT_PREFIX } from "./data/policy";
import { prefixOf, scanText, type BlockContext } from "./scan";
import type { Violation } from "./types";

/** R4: a criterion number, the standard name or a level that the block's criterion slot does not hold */
export function checkCriteria(sentences: readonly string[], c: BlockContext): Violation[] {
  const held = new Set(
    Object.entries(c.blockSlots)
      .filter(([id]) => prefixOf(id) === CRITERION_SLOT_PREFIX)
      .flatMap(([, value]) => value.split(/\s+/))
  );
  return sentences.flatMap((sentence) => {
    const text = scanText(c, sentence);
    return CRITERION_PATTERNS.flatMap(({ source, flags }) =>
      [...text.matchAll(new RegExp(source, flags))]
        .map((m) => m[0])
        .filter((match) => !held.has(match))
        .map((match): Violation => ({
          rule: "R4",
          detail: "A criterion or level that is not a value of this block",
          match
        }))
    );
  });
}
