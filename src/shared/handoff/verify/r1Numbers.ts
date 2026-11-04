import { NUMBER_WORDS } from "./data/numberWords";
import { HEX_PATTERN, NUMBER_PATTERN } from "./patterns";
import { scanText, type BlockContext } from "./scan";
import type { Violation } from "./types";

const WORDS = new RegExp(`\\b(?:${NUMBER_WORDS.join("|")})\\b`, "gi");
const numbersIn = (text: string) =>
  [...text.replace(HEX_PATTERN, " ").matchAll(NUMBER_PATTERN)].map((m) => m[0]);
const wordsIn = (text: string) => [...text.matchAll(WORDS)].map((m) => m[0].toLowerCase());

/** Numbers the block may print as they are: those in its template text, and in filled-in-ids form its slot values */
function allowedNumbers(c: BlockContext): Set<string> {
  const allowed = new Set(numbersIn(c.literal));
  if (c.filled) return allowed;
  for (const value of Object.values(c.blockSlots)) {
    if (/^#[0-9A-Fa-f]{3,}$/.test(value)) continue;
    if (/\d/.test(value)) allowed.add(value);
    numbersIn(value).forEach((token) => allowed.add(token));
  }
  return allowed;
}

/** R1: a digit run or a spelled-out number that is not an id, a slot value or template text */
export function checkNumbers(sentences: readonly string[], c: BlockContext): Violation[] {
  const allowed = allowedNumbers(c);
  const allowedWords = new Set(wordsIn(c.literal));
  return sentences.flatMap((sentence) => {
    const text = scanText(c, sentence);
    const digits = numbersIn(text)
      .filter((token) => !allowed.has(token))
      .map((match): Violation => ({
        rule: "R1",
        detail: "A number that is not a value of this block",
        match
      }));
    const words = wordsIn(text)
      .filter((word) => !allowedWords.has(word))
      .map((match): Violation => ({ rule: "R1", detail: "A spelled-out number", match }));
    return [...digits, ...words];
  });
}
