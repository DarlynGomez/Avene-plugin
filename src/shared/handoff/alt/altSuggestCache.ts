import { fits } from "../limits";
import { verifyAltSuggestion } from "./altVerifier";

/** One saved suggestion for a picture, found by the picture and the model that wrote it */
export interface CachedSuggestion {
  imageHash: string;
  modelId: string;
  kind: "describe" | "decorative";
  text: string;
  at: string;
}

export const cacheKey = (imageHash: string, modelId: string): string => `${imageHash}|${modelId}`;

function readEntry(value: unknown): CachedSuggestion | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.imageHash !== "string" || raw.imageHash === "") return null;
  if (typeof raw.modelId !== "string" || raw.modelId === "") return null;
  if (typeof raw.at !== "string" || typeof raw.text !== "string") return null;
  if (raw.kind === "decorative") {
    return {
      imageHash: raw.imageHash,
      modelId: raw.modelId,
      kind: "decorative",
      text: "",
      at: raw.at
    };
  }
  // Checked again on the way in, so a saved suggestion that no longer passes is not shown
  if (raw.kind !== "describe" || !verifyAltSuggestion(raw.text).ok) return null;
  return {
    imageHash: raw.imageHash,
    modelId: raw.modelId,
    kind: "describe",
    text: raw.text.trim(),
    at: raw.at
  };
}

export function cleanSuggestions(values: readonly unknown[]): CachedSuggestion[] {
  const byKey = new Map<string, CachedSuggestion>();
  for (const value of values) {
    const entry = readEntry(value);
    if (entry) byKey.set(cacheKey(entry.imageHash, entry.modelId), entry);
  }
  return [...byKey.values()];
}

export function parseSuggestCache(raw: string): CachedSuggestion[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const list = (parsed as { v?: unknown; entries?: unknown } | null)?.entries;
    return (parsed as { v?: unknown } | null)?.v === 1 && Array.isArray(list)
      ? cleanSuggestions(list)
      : [];
  } catch {
    return [];
  }
}

/** The oldest go first when the file would not fit in one entry, so the newest suggestions are the ones kept */
export function fitSuggestions(entries: readonly CachedSuggestion[]): CachedSuggestion[] {
  const newestFirst = [...cleanSuggestions(entries)].sort((a, b) =>
    a.at < b.at ? 1 : a.at > b.at ? -1 : 0
  );
  const kept: CachedSuggestion[] = [];
  for (const entry of newestFirst) {
    if (!fits(JSON.stringify({ v: 1, entries: [...kept, entry] }))) break;
    kept.push(entry);
  }
  return kept;
}

/** An empty string when there is nothing to keep, so the entry can be cleared */
export function serializeSuggestCache(entries: readonly CachedSuggestion[]): string {
  const kept = fitSuggestions(entries);
  return kept.length === 0 ? "" : JSON.stringify({ v: 1, entries: kept });
}

export function putSuggestion(
  entries: readonly CachedSuggestion[],
  entry: CachedSuggestion
): CachedSuggestion[] {
  return [
    ...entries.filter(
      (e) => cacheKey(e.imageHash, e.modelId) !== cacheKey(entry.imageHash, entry.modelId)
    ),
    entry
  ];
}

/** The model is named when it is known, otherwise the newest suggestion for the picture is used */
export function pickSuggestion(
  entries: readonly CachedSuggestion[],
  imageHash: string,
  modelId: string | null
): CachedSuggestion | null {
  const matches = entries.filter(
    (entry) => entry.imageHash === imageHash && (modelId === null || entry.modelId === modelId)
  );
  return matches.sort((a, b) => (a.at < b.at ? 1 : -1))[0] ?? null;
}
