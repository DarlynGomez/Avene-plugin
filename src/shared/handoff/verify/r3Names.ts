import { MIN_NAME_LENGTH, NAME_SLOT_PREFIXES } from "./data/policy";
import { QUOTED_PATTERN } from "./patterns";
import { prefixOf, stripIds, type BlockContext } from "./scan";
import type { Violation } from "./types";

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function literalNames(c: BlockContext): string[] {
  return Object.entries(c.slots)
    .filter(
      ([id, value]) => NAME_SLOT_PREFIXES.includes(prefixOf(id)) && value.length >= MIN_NAME_LENGTH
    )
    .map(([, value]) => value);
}

/**
 * R3: a name written out where an id belongs, and quoted or code text that is not an id
 * Limit: an invented name written without quotes is not caught here, the designer's review is the control
 */
export function checkNames(sentences: readonly string[], c: BlockContext): Violation[] {
  const known = new Set(Object.values(c.blockSlots));
  return sentences.flatMap((sentence) => {
    const text = stripIds(sentence);
    const out: Violation[] = [];
    // Filled text carries the names legitimately, so only quoted text that nobody supplied counts
    if (!c.filled) {
      for (const name of literalNames(c)) {
        if (new RegExp(`(?<![A-Za-z0-9])${escape(name)}(?![A-Za-z0-9])`, "i").test(text)) {
          out.push({ rule: "R3", detail: "A name written out instead of its id", match: name });
        }
      }
    }
    for (const m of sentence.matchAll(QUOTED_PATTERN)) {
      const inner = (m[1] ?? m[2] ?? m[3] ?? "").trim();
      const left = c.filled && known.has(inner) ? "" : stripIds(inner).trim();
      if (left !== "")
        out.push({ rule: "R3", detail: "Quoted text that is not an id", match: inner });
    }
    return out;
  });
}
