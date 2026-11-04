import {
  clearDeferrals,
  countsOf,
  pruneDeferrals,
  recordDeferral
} from "../../shared/calendar/deferrals";
import type {
  CalendarPluginMessage,
  CalendarStateMessage,
  CalendarUiMessage
} from "../../shared/calendar/calendarMessages";
import { isGoogleCalendarUrl } from "../../shared/calendar/googleUrl";
import { normalizeSettings } from "../../shared/calendar/settings";
import { FEATURE_CALENDAR, calendarAllowed } from "../../shared/calendarFlags";
import { isStudyActive } from "../../shared/study/studyActive";
import {
  currentUserName,
  loadCalendarSettings,
  saveCalendarSettings
} from "../calendar/adapter/settingsStore";
import { loadDeferrals, saveDeferrals } from "../calendar/adapter/deferralStore";
import { loadFileUrl } from "../handoff/adapter/fileUrlStore";
import { activeStudySession } from "../study/adapter/studySessionStore";

type Reply = (message: CalendarPluginMessage) => void;

/** The flag is read first so a build with the calendar off touches no storage at all */
function calendarOpen(): boolean {
  return FEATURE_CALENDAR && calendarAllowed(FEATURE_CALENDAR, isStudyActive(activeStudySession()));
}

async function state(): Promise<CalendarStateMessage> {
  return {
    type: "CALENDAR_STATE",
    settings: await loadCalendarSettings(),
    counts: countsOf(loadDeferrals()),
    userName: currentUserName(),
    fileUrl: loadFileUrl()
  };
}

async function handle(message: CalendarUiMessage, reply: Reply): Promise<void> {
  switch (message.type) {
    case "CALENDAR_STATE_REQUEST": {
      // An empty list means the panel has nothing loaded yet, so nothing is dropped
      if (message.live.length > 0)
        saveDeferrals(pruneDeferrals(loadDeferrals(), new Set(message.live)));
      break;
    }
    case "CALENDAR_DEFERRED":
      saveDeferrals(recordDeferral(loadDeferrals(), message.signature, new Date().toISOString()));
      break;
    case "CALENDAR_SCHEDULED":
      saveDeferrals(clearDeferrals(loadDeferrals(), message.signatures));
      break;
    case "CALENDAR_RESET":
      saveDeferrals({});
      break;
    case "CALENDAR_SETTINGS_SET":
      await saveCalendarSettings(normalizeSettings(message.settings));
      break;
    case "CALENDAR_OPEN_URL":
      // Only the calendar render address is opened, whatever the panel sent
      if (isGoogleCalendarUrl(message.url)) figma.openExternal(message.url);
      return;
  }
  reply(await state());
}

/** Refuses every calendar message while the calendar is off or a study session is active, with no read and no write */
export async function handleCalendarMessage(
  message: CalendarUiMessage,
  reply: Reply
): Promise<void> {
  if (!calendarOpen()) {
    reply({ type: "CALENDAR_REFUSED" });
    return;
  }
  try {
    await handle(message, reply);
  } catch (error) {
    console.error("handleCalendarMessage: a calendar message could not be handled", error);
  }
}
