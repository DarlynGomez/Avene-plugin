import { describe, expect, it } from "vitest";

import { eventSummary } from "./eventSummary";
import type { FocusEvent } from "./types";

const event: FocusEvent = {
  title: "Design Review: A11y Triage (1 item)",
  body: "1. sage/muted on white",
  start: new Date(2026, 10, 3, 10, 0),
  end: new Date(2026, 10, 3, 10, 15),
  link: null
};

describe("eventSummary", () => {
  it("is the title, when and how long, then the body", () => {
    expect(eventSummary(event)).toBe(
      "Design Review: A11y Triage (1 item)\nWhen: 2026-11-03 10:00 AM, 15 minutes\n\n1. sage/muted on white"
    );
  });

  it("says minute for one", () => {
    expect(eventSummary({ ...event, end: new Date(2026, 10, 3, 10, 1) })).toContain("1 minute\n");
  });
});
