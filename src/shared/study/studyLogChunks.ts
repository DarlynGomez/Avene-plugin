import type { StudyEvent } from "./studyEvents";

/** Under the 100 kB entry limit with room for the plugin id and the key */
export const MAX_CHUNK_BYTES = 60000;

export type AppendPlan =
  { ok: true; target: "last" | "new"; events: StudyEvent[] } | { ok: false; reason: "too_large" };

function byteLength(events: readonly StudyEvent[]): number {
  return new TextEncoder().encode(JSON.stringify(events)).length;
}

/**
 * Decides where one more event goes, in the last chunk if it still fits, else a new one
 * An event that cannot fit an empty chunk is refused
 */
export function planAppend(
  lastChunk: readonly StudyEvent[],
  event: StudyEvent,
  maxBytes = MAX_CHUNK_BYTES
): AppendPlan {
  const joined = [...lastChunk, event];
  if (lastChunk.length > 0 && byteLength(joined) <= maxBytes) {
    return { ok: true, target: "last", events: joined };
  }
  if (byteLength([event]) <= maxBytes) {
    return { ok: true, target: lastChunk.length > 0 ? "new" : "last", events: [event] };
  }
  return { ok: false, reason: "too_large" };
}
