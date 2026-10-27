import { HEX_PATTERN } from "./patterns";
import { scanText, type BlockContext } from "./scan";
import type { Violation } from "./types";

/** R2: a color code that is not exactly a slot value of this block */
export function checkHex(sentences: readonly string[], c: BlockContext): Violation[] {
  const values = new Set(Object.values(c.blockSlots).map((value) => value.toLowerCase()));
  return sentences.flatMap((sentence) =>
    [...scanText(c, sentence).matchAll(HEX_PATTERN)]
      .map((m) => m[0])
      .filter((match) => !values.has(match.toLowerCase()))
      .map((match): Violation => ({
        rule: "R2",
        detail: "A color code that is not a value of this block",
        match
      }))
  );
}
