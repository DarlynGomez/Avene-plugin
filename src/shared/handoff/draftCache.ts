import type { Audience } from "./types";

/** One draft for one block of one reader's version, in id form, with the findings it was written from */
export interface DraftEntry {
  audience: Audience;
  blockId: string;
  modelId: string;
  /** The structure hash of the version when the draft was made, a different one now means stale */
  structureHash: string;
  sentences: string[];
  generatedAt: string;
}

export type DraftCache = Record<string, DraftEntry>;

const AUDIENCES: readonly string[] = ["developer", "pm", "higherUp", "client"];

export const cacheKey = (audience: string, blockId: string, modelId: string): string =>
  `${audience}|${blockId}|${modelId}`;

export function normalizeEntry(value: unknown): DraftEntry | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const text = (x: unknown): x is string => typeof x === "string" && x !== "";
  if (!AUDIENCES.includes(v.audience as string)) return null;
  if (!text(v.blockId) || !text(v.modelId) || !text(v.structureHash) || !text(v.generatedAt))
    return null;
  if (!Array.isArray(v.sentences) || v.sentences.length === 0) return null;
  if (!v.sentences.every((s) => typeof s === "string" && s.trim() !== "")) return null;
  return {
    audience: v.audience as Audience,
    blockId: v.blockId,
    modelId: v.modelId,
    structureHash: v.structureHash,
    sentences: v.sentences as string[],
    generatedAt: v.generatedAt
  };
}

/** Bad entries are dropped and every key is rebuilt from the entry, so a key can never disagree with it */
export function cleanCache(raw: Readonly<Record<string, unknown>>): DraftCache {
  const out: DraftCache = {};
  for (const value of Object.values(raw)) {
    const entry = normalizeEntry(value);
    if (entry) out[cacheKey(entry.audience, entry.blockId, entry.modelId)] = entry;
  }
  return out;
}

export function parseCache(raw: string): DraftCache {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? cleanCache(parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function serializeCache(cache: Readonly<Record<string, unknown>>): string {
  const clean = cleanCache(cache);
  return Object.keys(clean).length === 0 ? "" : JSON.stringify(clean);
}

export function putEntry(cache: DraftCache, entry: DraftEntry): DraftCache {
  return { ...cache, [cacheKey(entry.audience, entry.blockId, entry.modelId)]: entry };
}

/** The latest draft for a block, whichever model made it */
export function newestEntry(
  cache: DraftCache,
  audience: Audience,
  blockId: string
): DraftEntry | null {
  const found = Object.values(cache).filter(
    (e) => e.audience === audience && e.blockId === blockId
  );
  return found.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null;
}
