import type { DraftEntry } from "./draftCache";
import type { Violation } from "./verify/types";
import { substituteIds } from "./verify/substitute";
import { verifyModelOutput } from "./verify/verifyBlock";

/** The part of a section a draft is about */
export interface BlockLines {
  id: string;
  lines: readonly string[];
}

export type CheckedDraft =
  { ok: true; sentences: string[]; filled: string[] } | { ok: false; violations: Violation[] };

/** Raw model output through the verifier, then the values go back in; the same path for a live and a cached draft */
export function checkDraft(
  sentences: unknown,
  block: BlockLines,
  slots: Readonly<Record<string, string>>
): CheckedDraft {
  const result = verifyModelOutput(sentences, { templateLines: block.lines, slots });
  if (!result.ok) return { ok: false, violations: result.blocking };
  const filled = substituteIds(sentences as string[], slots);
  return filled.ok
    ? { ok: true, sentences: sentences as string[], filled: filled.lines }
    : {
        ok: false,
        violations: [{ rule: "R7", detail: "An id with no value", match: filled.unknown[0] }]
      };
}

export type DraftOffer =
  | { state: "none" }
  | { state: "stale" }
  | { state: "rejected" }
  | { state: "ready"; modelId: string; sentences: string[]; filled: string[] };

/** What can be offered for a block now: only a current draft that passes the checks again */
export function offerFor(
  entry: DraftEntry | null,
  block: BlockLines,
  doc: { structureHash: string; slots: Readonly<Record<string, string>> }
): DraftOffer {
  if (!entry) return { state: "none" };
  if (entry.structureHash !== doc.structureHash) return { state: "stale" };
  const checked = checkDraft(entry.sentences, block, doc.slots);
  return checked.ok
    ? {
        state: "ready",
        modelId: entry.modelId,
        sentences: checked.sentences,
        filled: checked.filled
      }
    : { state: "rejected" };
}
