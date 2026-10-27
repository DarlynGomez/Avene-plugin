import { parseCache, serializeCache, type DraftCache } from "../../../shared/handoff/draftCache";
import { KEY_HANDOFF_DRAFTS } from "../handoffKeys";
import { writeEntry, type StoreResult } from "./storeResult";

export function loadDraftCache(): DraftCache {
  return parseCache(figma.root.getPluginData(KEY_HANDOFF_DRAFTS));
}

export interface DraftSaveResult extends StoreResult {
  /** What is stored now: the new cache if it was kept, the old one if it was refused */
  cache: DraftCache;
}

/** Replaces the whole cache, a cache over the size guard is refused and the old one stays */
export function saveDraftCache(cache: DraftCache): DraftSaveResult {
  const result = writeEntry(figma.root, KEY_HANDOFF_DRAFTS, serializeCache(cache));
  return { ...result, cache: result.saved ? parseCache(serializeCache(cache)) : loadDraftCache() };
}
