import { CLIENT_LINE, HIGHER_UP_LINE, NOT_COVERED_LINE } from "../fixedLines";
import { ID_PATTERN } from "./patterns";
import { idsIn, stripIds, type BlockContext } from "./scan";
import type { Violation } from "./types";

const squash = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();
const FIXED = [
  NOT_COVERED_LINE,
  NOT_COVERED_LINE.replace(/^Needs check: /, ""),
  CLIENT_LINE,
  HIGHER_UP_LINE
].map(squash);

/** The shape: an array of non-empty strings, nothing else is looked at until it is */
export function checkShape(raw: unknown): Violation[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.some((s) => typeof s !== "string")) {
    return [{ rule: "R7", detail: "The reply is not a list of sentences" }];
  }
  return [];
}

/** R7: no empty sentence, no id the block does not have, no stray braces, no fixed line repeated */
export function checkStructure(sentences: readonly string[], c: BlockContext): Violation[] {
  return sentences.flatMap((sentence) => {
    const out: Violation[] = [];
    if (sentence.trim() === "") out.push({ rule: "R7", detail: "An empty sentence" });
    if (!c.filled) {
      for (const id of idsIn(sentence)) {
        if (!(id in c.blockSlots))
          out.push({ rule: "R7", detail: "An id this block does not have", match: id });
      }
      if (/[{}]/.test(stripIds(sentence).replace(ID_PATTERN, ""))) {
        out.push({ rule: "R7", detail: "A stray brace", match: sentence });
      }
    }
    const flat = squash(sentence);
    if (FIXED.some((fixed) => flat.includes(fixed))) {
      out.push({ rule: "R7", detail: "A fixed line written into a sentence", match: sentence });
    }
    return out;
  });
}
