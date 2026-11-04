import {
  parseDeferrals,
  serializeDeferrals,
  type DeferralMap
} from "../../../shared/calendar/deferrals";
import { writeEntry, type StoreResult } from "../../handoff/adapter/storeResult";
import { KEY_DEFERRALS } from "../calendarKeys";

export function loadDeferrals(): DeferralMap {
  return parseDeferrals(figma.root.getPluginData(KEY_DEFERRALS));
}

/** The counts belong to the file, a refused write keeps the old ones */
export function saveDeferrals(map: DeferralMap): StoreResult {
  return writeEntry(figma.root, KEY_DEFERRALS, serializeDeferrals(map));
}
