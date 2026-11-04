import { describe, expect, it } from "vitest";

import { utf8Length } from "../handoff/limits";
import { buildIcs, escapeText, eventUid, foldLine } from "./ics";
import type { FocusEvent } from "./types";

const event: FocusEvent = {
  title: "Design Review: Batch A11y Triage (3 items)",
  body: "Line one\nWith, a comma; and a semicolon \\ slash",
  start: new Date(2026, 10, 3, 10, 0),
  end: new Date(2026, 10, 3, 10, 45),
  link: "https://www.figma.com/design/KEY/F?node-id=1-2"
};
const NOW = new Date(Date.UTC(2026, 10, 2, 17, 0, 0));
const unfold = (text: string) => text.replace(/\r\n /g, "");

describe("escapeText", () => {
  it("escapes backslash, semicolon, comma and line breaks", () => {
    expect(escapeText("a\\b;c,d\ne\r\nf")).toBe("a\\\\b\\;c\\,d\\ne\\nf");
  });
});

describe("foldLine", () => {
  it("leaves a short line alone", () => {
    expect(foldLine("SUMMARY:short")).toEqual(["SUMMARY:short"]);
  });

  it("keeps every physical line within 75 octets and loses nothing", () => {
    const long = `DESCRIPTION:${"word ".repeat(80)}`;
    const parts = foldLine(long);
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(utf8Length(part)).toBeLessThanOrEqual(75);
    expect(parts.slice(1).every((p) => p.startsWith(" "))).toBe(true);
    expect(parts.join("\r\n").replace(/\r\n /g, "")).toBe(long);
  });

  it("never cuts inside a character of several octets", () => {
    const wide = `DESCRIPTION:${"é€\u{1F4C5}".repeat(30)}`;
    const parts = foldLine(wide);
    for (const part of parts) expect(utf8Length(part)).toBeLessThanOrEqual(75);
    expect(parts.join("\r\n").replace(/\r\n /g, "")).toBe(wide);
  });
});

describe("buildIcs", () => {
  const text = buildIcs(event, "abc-20261103T100000@avene", NOW);
  const lines = text.split("\r\n");

  it("is a calendar with one event, joined by CRLF and ending with one", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines.at(-2)).toBe("END:VCALENDAR");
    expect(lines.at(-1)).toBe("");
    expect(text).not.toMatch(/[^\r]\n/);
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(text.match(/END:VEVENT/g)).toHaveLength(1);
  });

  it("carries the required properties", () => {
    const body = unfold(text);
    expect(body).toContain("VERSION:2.0");
    expect(body).toContain("PRODID:-//Avene//Focus Time//EN");
    expect(body).toContain("UID:abc-20261103T100000@avene");
    expect(body).toContain("DTSTAMP:20261102T170000Z");
    expect(body).toContain("DTSTART:20261103T100000");
    expect(body).toContain("DTEND:20261103T104500");
    expect(body).toContain("SUMMARY:Design Review: Batch A11y Triage (3 items)");
    expect(body).toContain("URL:https://www.figma.com/design/KEY/F?node-id=1-2");
  });

  it("writes the start in local time with no zone, so it is read in the owner's own", () => {
    expect(text).toMatch(/DTSTART:\d{8}T\d{6}\r\n/);
    expect(text).not.toMatch(/DTSTART[^:]*Z/);
  });

  it("escapes the description and keeps it on folded lines", () => {
    expect(unfold(text)).toContain(
      "DESCRIPTION:Line one\\nWith\\, a comma\\; and a semicolon \\\\ slash"
    );
    for (const line of lines) expect(utf8Length(line)).toBeLessThanOrEqual(75);
  });

  it("has a reminder ten minutes before", () => {
    expect(text).toContain("BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT10M");
    expect(text).toContain("END:VALARM");
  });

  it("leaves out the address when there is none", () => {
    expect(buildIcs({ ...event, link: null }, "u", NOW)).not.toContain("URL:");
  });
});

describe("eventUid", () => {
  const start = new Date(2026, 10, 3, 10, 0);

  it("is the same for the same roots and start, in any call", () => {
    expect(eventUid(["a", "b"], start)).toBe(eventUid(["a", "b"], start));
  });

  it("changes with the roots or the start", () => {
    expect(eventUid(["a"], start)).not.toBe(eventUid(["b"], start));
    expect(eventUid(["a"], start)).not.toBe(eventUid(["a"], new Date(2026, 10, 3, 14, 0)));
    expect(eventUid(["a"], start)).toMatch(/^[0-9a-f]{8}-20261103T100000@avene$/);
  });
});
