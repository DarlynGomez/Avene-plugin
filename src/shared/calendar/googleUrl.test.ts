import { describe, expect, it } from "vitest";

import { googleCalendarUrl, isGoogleCalendarUrl } from "./googleUrl";
import type { FocusEvent } from "./types";

const event: FocusEvent = {
  title: "Design Review: Batch A11y Triage (3 items)",
  body: "Line one\nLine two & more #9CB5B1",
  start: new Date(2026, 10, 3, 10, 0),
  end: new Date(2026, 10, 3, 10, 45),
  link: null
};

describe("googleCalendarUrl", () => {
  it("is the render address with the title, details and local times", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(`${url.origin}${url.pathname}`).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe(event.title);
    expect(url.searchParams.get("details")).toBe(event.body);
    expect(url.searchParams.get("dates")).toBe("20261103T100000/20261103T104500");
  });

  it("encodes what would break an address", () => {
    const text = googleCalendarUrl(event);
    expect(text).not.toContain("\n");
    expect(text).not.toContain(" ");
    expect(text).not.toContain("#9CB5B1");
  });

  it("cuts long details", () => {
    const url = new URL(googleCalendarUrl({ ...event, body: "x".repeat(5000) }));
    const details = url.searchParams.get("details") ?? "";
    expect(details.length).toBeLessThan(1600);
    expect(details.endsWith("...")).toBe(true);
  });
});

describe("isGoogleCalendarUrl", () => {
  it("accepts only the render address", () => {
    expect(isGoogleCalendarUrl(googleCalendarUrl(event))).toBe(true);
    expect(isGoogleCalendarUrl("https://calendar.google.com/calendar/other?x=1")).toBe(false);
    expect(isGoogleCalendarUrl("https://calendar.google.com.evil.com/calendar/render?x=1")).toBe(
      false
    );
    expect(isGoogleCalendarUrl("http://calendar.google.com/calendar/render?x=1")).toBe(false);
    expect(isGoogleCalendarUrl("javascript:alert(1)")).toBe(false);
  });
});
