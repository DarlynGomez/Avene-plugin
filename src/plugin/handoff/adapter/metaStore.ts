import {
  parseMeta,
  pruneMeta,
  serializeMeta,
  type HandoffMetaMap
} from "../../../shared/handoff/metaStorage";
import { KEY_HANDOFF_META } from "../handoffKeys";
import { writeEntry, type StoreResult } from "./storeResult";

export function loadHandoffMeta(): HandoffMetaMap {
  return parseMeta(figma.root.getPluginData(KEY_HANDOFF_META));
}

export interface MetaSaveResult extends StoreResult {
  /** What was kept, with empty entries dropped and stale ones pruned */
  map: HandoffMetaMap;
}

/** Replaces the whole map, with a live set of signatures from the panel stale entries are pruned */
export function saveHandoffMeta(map: HandoffMetaMap, live?: ReadonlySet<string>): MetaSaveResult {
  const kept = parseMeta(serializeMeta(live ? pruneMeta(map, live) : map));
  const result = writeEntry(figma.root, KEY_HANDOFF_META, serializeMeta(kept));
  return { ...result, map: result.saved ? kept : loadHandoffMeta() };
}
