import {
  fitSuggestions,
  parseSuggestCache,
  serializeSuggestCache,
  type CachedSuggestion
} from "../../../shared/handoff/alt/altSuggestCache";
import { KEY_ALT_SUGGEST } from "../handoffKeys";
import { writeEntry, type StoreResult } from "./storeResult";

/** The saved suggestions, checked again as they are read so one that no longer passes is not shown */
export function loadSuggestions(): CachedSuggestion[] {
  return parseSuggestCache(figma.root.getPluginData(KEY_ALT_SUGGEST));
}

/** Written whole, the oldest dropped when they would not fit one entry, and the stored list handed back */
export function saveSuggestions(entries: readonly CachedSuggestion[]): StoreResult & {
  entries: CachedSuggestion[];
} {
  const result = writeEntry(figma.root, KEY_ALT_SUGGEST, serializeSuggestCache(entries));
  return { ...result, entries: result.saved ? fitSuggestions(entries) : loadSuggestions() };
}
