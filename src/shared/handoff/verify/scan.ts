import { ID_PATTERN } from "./patterns";
import type { VerifyContext } from "./types";

/** What the rules share: the slots the block uses, its literal text, and which form the text is in */
export interface BlockContext {
  templateLines: readonly string[];
  slots: Readonly<Record<string, string>>;
  blockSlots: Readonly<Record<string, string>>;
  /** Template text with ids taken out, so numbers and words in it stay allowed */
  literal: string;
  /** True for text with values already filled in, as the designer edits it */
  filled: boolean;
}

export function idsIn(text: string): string[] {
  return [...text.matchAll(ID_PATTERN)].map((match) => match[1]);
}

export function stripIds(text: string): string {
  return text.replace(ID_PATTERN, " ");
}

export function prefixOf(id: string): string {
  return id.replace(/\d+$/, "");
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Takes the values out of filled text, longest first, so only words nobody supplied are left */
export function blankValues(text: string, values: readonly string[]): string {
  const sorted = [...new Set(values)].filter((v) => v !== "").sort((a, b) => b.length - a.length);
  return sorted.reduce(
    (out, value) =>
      out.replace(new RegExp(`(?<![A-Za-z0-9])${escape(value)}(?![A-Za-z0-9])`, "g"), " "),
    text
  );
}

export function blockContext(ctx: VerifyContext, filled: boolean): BlockContext {
  const ids = new Set(ctx.templateLines.flatMap(idsIn));
  const blockSlots = Object.fromEntries(Object.entries(ctx.slots).filter(([id]) => ids.has(id)));
  return {
    templateLines: ctx.templateLines,
    slots: ctx.slots,
    blockSlots,
    literal: stripIds(ctx.templateLines.join(" ")),
    filled
  };
}

/** The text a rule scans: ids taken out, or in filled text the supplied values taken out */
export function scanText(c: BlockContext, sentence: string): string {
  return c.filled ? blankValues(sentence, Object.values(c.blockSlots)) : stripIds(sentence);
}
