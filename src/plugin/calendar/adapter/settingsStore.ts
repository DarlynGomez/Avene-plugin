import { normalizeSettings } from "../../../shared/calendar/settings";
import type { CalendarSettings } from "../../../shared/calendar/types";
import { KEY_CALENDAR_SETTINGS } from "../calendarKeys";

/** Settings follow the designer from file to file, so they live with the user and not the file */
export async function loadCalendarSettings(): Promise<CalendarSettings> {
  try {
    return normalizeSettings(await figma.clientStorage.getAsync(KEY_CALENDAR_SETTINGS));
  } catch {
    return normalizeSettings(null);
  }
}

export async function saveCalendarSettings(settings: CalendarSettings): Promise<boolean> {
  try {
    await figma.clientStorage.setAsync(KEY_CALENDAR_SETTINGS, settings);
    return true;
  } catch {
    return false;
  }
}

/** The name shown on the profile pill, nothing when the user is not known */
export function currentUserName(): string | null {
  return figma.currentUser?.name ?? null;
}
