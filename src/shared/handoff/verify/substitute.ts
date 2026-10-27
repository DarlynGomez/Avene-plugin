import { ID_PATTERN } from "./patterns";

export type SubstituteResult = { ok: true; lines: string[] } | { ok: false; unknown: string[] };

/** Puts values back for ids, and refuses the whole block when any id is not in the table */
export function substituteIds(
  sentences: readonly string[],
  slots: Readonly<Record<string, string>>
): SubstituteResult {
  const unknown = new Set<string>();
  const lines = sentences.map((sentence) =>
    sentence.replace(ID_PATTERN, (match, id: string) => {
      if (!Object.hasOwn(slots, id)) unknown.add(id);
      return Object.hasOwn(slots, id) ? slots[id] : match;
    })
  );
  return unknown.size > 0 ? { ok: false, unknown: [...unknown] } : { ok: true, lines };
}
