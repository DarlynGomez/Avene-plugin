import { plural } from "../handoff/text";
import { fieldValues, formatClock } from "./slots";
import type { FocusEvent } from "./types";

/** The event as plain text, for a designer whose calendar does not take a link or a file */
export function eventSummary(event: FocusEvent): string {
  const minutes = Math.round((event.end.getTime() - event.start.getTime()) / 60_000);
  const when = `${fieldValues(event.start).date} ${formatClock(event.start)}, ${minutes} ${plural(minutes, "minute", "minutes")}`;
  return [event.title, `When: ${when}`, "", event.body].join("\n");
}
