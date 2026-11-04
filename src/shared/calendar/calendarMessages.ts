import { normalizeSettings } from "./settings";
import type { CalendarSettings } from "./types";

export type CalendarUiMessage =
  /** The signatures of roots that still need a decision, so counts of gone roots can go */
  | { type: "CALENDAR_STATE_REQUEST"; live: string[] }
  /** The panel deferred this root, the signature is worked out there */
  | { type: "CALENDAR_DEFERRED"; signature: string }
  /** These roots were put on a calendar, their counts start again */
  | { type: "CALENDAR_SCHEDULED"; signatures: string[] }
  | { type: "CALENDAR_SETTINGS_SET"; settings: CalendarSettings }
  | { type: "CALENDAR_OPEN_URL"; url: string }
  | { type: "CALENDAR_RESET" };

export interface CalendarStateMessage {
  type: "CALENDAR_STATE";
  settings: CalendarSettings;
  counts: Record<string, number>;
  userName: string | null;
  fileUrl: string | null;
}

/** Sent for every calendar message while the calendar is off or a study session is active */
export interface CalendarRefused {
  type: "CALENDAR_REFUSED";
}

export type CalendarPluginMessage = CalendarStateMessage | CalendarRefused;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** Shape only, a settings object is made safe by the handler */
export function isCalendarUiMessage(value: unknown): value is CalendarUiMessage {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case "CALENDAR_STATE_REQUEST":
      return isStrings(value.live);
    case "CALENDAR_DEFERRED":
      return typeof value.signature === "string" && value.signature !== "";
    case "CALENDAR_SCHEDULED":
      return isStrings(value.signatures);
    case "CALENDAR_SETTINGS_SET":
      return isRecord(value.settings);
    case "CALENDAR_OPEN_URL":
      return typeof value.url === "string";
    case "CALENDAR_RESET":
      return true;
    default:
      return false;
  }
}

/** Shape only, the panel ignores any other message */
export function isCalendarPluginMessage(value: unknown): value is CalendarPluginMessage {
  if (!isRecord(value)) return false;
  if (value.type === "CALENDAR_REFUSED") return true;
  return (
    value.type === "CALENDAR_STATE" &&
    isRecord(value.settings) &&
    isRecord(value.counts) &&
    (value.userName === null || typeof value.userName === "string") &&
    (value.fileUrl === null || typeof value.fileUrl === "string")
  );
}

/** Settings from a state message, made safe again on this side of the boundary */
export function settingsOf(message: CalendarStateMessage): CalendarSettings {
  return normalizeSettings(message.settings);
}
