import { eventBody, eventTitle, firstLink } from "./eventText";
import { endOf } from "./slots";
import type {
  CalendarSettings,
  FocusEvent,
  FocusItem,
  SessionMinutes,
  TriggerCount
} from "./types";

/** One root gets a short look, several get the length the designer chose */
const SINGLE_MINUTES: SessionMinutes = 15;

export function thresholdOf(trigger: TriggerCount): number | null {
  return trigger === "off" ? null : trigger;
}

export function isDue(count: number, trigger: TriggerCount): boolean {
  const threshold = thresholdOf(trigger);
  return threshold !== null && count >= threshold;
}

/** The roots deferred often enough to be worth time on the calendar */
export function dueItems(items: readonly FocusItem[], trigger: TriggerCount): FocusItem[] {
  return items.filter((item) => isDue(item.deferCount, trigger));
}

export function sessionMinutes(itemCount: number, settings: CalendarSettings): SessionMinutes {
  return itemCount <= 1 ? SINGLE_MINUTES : settings.minutes;
}

/** The event for these roots at this start, with the text a reminder needs */
export function buildEvent(
  items: readonly FocusItem[],
  start: Date,
  settings: CalendarSettings,
  fileUrl?: string
): FocusEvent {
  return {
    title: eventTitle(items.length),
    body: eventBody(items, fileUrl),
    start,
    end: endOf(start, sessionMinutes(items.length, settings)),
    link: firstLink(items, fileUrl)
  };
}
