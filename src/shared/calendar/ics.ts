import { findingsHash } from "../handoff/hash";
import { utf8Length } from "../handoff/limits";
import { localStamp, utcStamp } from "./slots";
import type { FocusEvent } from "./types";

const ALARM_MINUTES_BEFORE = 10;
const LINE_OCTETS = 75;

export function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets continue on the next line after one space, never inside a character */
export function foldLine(line: string): string[] {
  const parts: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const width = utf8Length(char);
    const room = parts.length === 0 ? LINE_OCTETS : LINE_OCTETS - 1;
    if (octets + width > room) {
      parts.push(current);
      current = "";
      octets = 0;
    }
    current += char;
    octets += width;
  }
  parts.push(current);
  return parts.map((part, i) => (i === 0 ? part : ` ${part}`));
}

/** The same roots at the same start always give the same id, so importing twice replaces */
export function eventUid(signatures: readonly string[], start: Date): string {
  const table = Object.fromEntries(signatures.map((signature, i) => [`s${i}`, signature]));
  return `${findingsHash(table)}-${localStamp(start)}@avene`;
}

export function buildIcs(event: FocusEvent, uid: string, now: Date): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Avene//Focus Time//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${localStamp(event.start)}`,
    `DTEND:${localStamp(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.body)}`,
    ...(event.link ? [`URL:${event.link}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `TRIGGER:-PT${ALARM_MINUTES_BEFORE}M`,
    `DESCRIPTION:${escapeText(event.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ];
  return `${lines.flatMap(foldLine).join("\r\n")}\r\n`;
}

export const ICS_MIME = "text/calendar;charset=utf-8";
