import { buildAudienceDoc } from "./audiences";
import { composeCopy, type ChosenText } from "./compose";
import { renderPmSummary } from "./pmSummary";
import { NOT_REVIEWED_LINE } from "./fixedLines";
import { dateOnly } from "./text";
import { buildTickets, renderTicket } from "./ticket";
import type { Audience, HandoffInput } from "./types";

export type Format = "spec" | "ticket" | "brief";

export const FORMAT_NAMES: Record<Format, string> = {
  spec: "1-Page Spec",
  ticket: "Jira/Linear",
  brief: "PM 3-Line"
};

/** Every reader can open every kind of document, the ticket just leaves color codes out unless it is for developers */
export const ALL_FORMATS: readonly Format[] = ["spec", "ticket", "brief"];

export interface Reviewer {
  name: string;
  date: string;
}

/** The raw text of a format, with the reviewer in it when there is one, which is what gets copied */
export function rawText(
  format: Format,
  input: HandoffInput,
  audience: Audience,
  chosen: ChosenText,
  reviewer: Reviewer | null,
  /** A copy made with no reviewer says so on its last line, so nobody takes it for a reviewed one */
  unreviewed = false
): string {
  const line = reviewer
    ? [`Reviewed by ${reviewer.name}, ${dateOnly(reviewer.date)}`]
    : unreviewed
      ? [NOT_REVIEWED_LINE]
      : [];
  if (format === "ticket") {
    const tickets = buildTickets(input, audience === "developer").map(renderTicket);
    return [...tickets.flatMap((t) => [t, ""]), ...line].join("\n").trim();
  }
  if (format === "brief") return [...renderPmSummary(input), ...line].join("\n");
  const doc = buildAudienceDoc(reviewer ? { ...input, reviewer } : input, audience);
  const text = composeCopy(doc, chosen, reviewer?.name ?? "[your name]");
  return unreviewed ? `${text}\n\n${NOT_REVIEWED_LINE}` : text;
}
