import type { Depth } from "./explanationTypes";

export interface Repeat {
  /** The later depth, which is the one to write again */
  depth: Depth;
  /** The earlier depth it repeats */
  other: Depth;
  why: "same opening" | "same sentence" | "same main claim" | "opens with a ratio";
}

const STOP = new Set([
  "that",
  "this",
  "with",
  "from",
  "have",
  "your",
  "they",
  "their",
  "than",
  "then",
  "will",
  "into",
  "when",
  "what",
  "which",
  "there",
  "about",
  "could",
  "would",
  "also",
  "such",
  "more",
  "most",
  "some",
  "each",
  "does",
  "text"
]);

/** Placeholders are taken out so two texts that differ only in a slot still compare on their words */
function plain(text: string): string {
  return text
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentences(text: string): string[] {
  return plain(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .trim()
    )
    .filter((s) => s !== "");
}

function opening(text: string): string {
  return plain(text)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(" ")
    .slice(0, 5)
    .join(" ");
}

function contentWords(sentence: string): Set<string> {
  return new Set(sentence.split(" ").filter((word) => word.length >= 4 && !STOP.has(word)));
}

/** Share of the words two sets have in common, out of all the words in either */
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const shared = [...a].filter((word) => b.has(word)).length;
  return shared / (a.size + b.size - shared);
}

const PAIRS: readonly [Depth, Depth][] = [
  [1, 2],
  [1, 3],
  [2, 3]
];

/** Where the three depths of one key repeat each other, empty when they do not */
export function findRepeats(texts: Readonly<Record<Depth, string>>): Repeat[] {
  const found: Repeat[] = [];
  for (const depth of [2, 3] as const) {
    if (/^\s*\{(?:measured|required)\}/.test(texts[depth])) {
      found.push({ depth, other: 1, why: "opens with a ratio" });
    }
  }
  for (const [earlier, later] of PAIRS) {
    const a = texts[earlier];
    const b = texts[later];
    const add = (why: Repeat["why"]) => found.push({ depth: later, other: earlier, why });
    if (opening(a) !== "" && opening(a) === opening(b)) add("same opening");
    const aSentences = sentences(a);
    if (sentences(b).some((s) => aSentences.includes(s))) add("same sentence");
    const first = (text: string) => contentWords(sentences(text)[0] ?? "");
    if (overlap(first(a), first(b)) >= 0.5) add("same main claim");
  }
  return found;
}
