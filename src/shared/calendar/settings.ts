import { STUDY_BUILD } from "../studyBuild";
import type {
  CalendarFormat,
  CalendarSettings,
  SessionMinutes,
  SlotPreference,
  TriggerCount
} from "./types";

export const DEFAULT_SETTINGS: CalendarSettings = {
  // The study build hands a calendar a file only, a demo build can also open Google Calendar
  format: STUDY_BUILD ? "ics" : "google",
  trigger: 3,
  minutes: 45,
  slot: "morning"
};

export const FORMAT_CHOICES: readonly CalendarFormat[] = STUDY_BUILD ? ["ics"] : ["google", "ics"];
export const TRIGGER_CHOICES: readonly TriggerCount[] = [3, 5, "off"];
export const MINUTE_CHOICES: readonly SessionMinutes[] = [15, 30, 45];
export const SLOT_CHOICES: readonly SlotPreference[] = ["morning", "afternoon", "custom"];

function pick<T>(choices: readonly T[], value: unknown, fallback: T): T {
  return choices.find((choice) => choice === value) ?? fallback;
}

/** Each field is checked alone, so one bad value never costs the others */
export function normalizeSettings(raw: unknown): CalendarSettings {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    format: pick(FORMAT_CHOICES, value.format, DEFAULT_SETTINGS.format),
    trigger: pick(TRIGGER_CHOICES, value.trigger, DEFAULT_SETTINGS.trigger),
    minutes: pick(MINUTE_CHOICES, value.minutes, DEFAULT_SETTINGS.minutes),
    slot: pick(SLOT_CHOICES, value.slot, DEFAULT_SETTINGS.slot)
  };
}

/** The first letter of the first and last word, nothing when there is no name */
export function initialsOf(name: string | null): string {
  const words = (name ?? "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const letters = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
  return letters.map((word) => Array.from(word)[0].toUpperCase()).join("");
}
