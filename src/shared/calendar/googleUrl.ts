import { localStamp } from "./slots";
import type { FocusEvent } from "./types";

const GOOGLE_RENDER = "https://calendar.google.com/calendar/render";

/** A long address is refused by some browsers so the details are cut, the file holds the whole text */
const DETAILS_MAX_CHARS = 1500;

export function googleCalendarUrl(event: FocusEvent): string {
  const details =
    event.body.length > DETAILS_MAX_CHARS
      ? `${event.body.slice(0, DETAILS_MAX_CHARS)}...`
      : event.body;
  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    details,
    dates: `${localStamp(event.start)}/${localStamp(event.end)}`
  });
  return `${GOOGLE_RENDER}?${query.toString()}`;
}

/** Only the render address is ever opened */
export function isGoogleCalendarUrl(url: string): boolean {
  return url.startsWith(`${GOOGLE_RENDER}?`);
}
