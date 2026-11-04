import { describe, expect, it } from "vitest";

import { calendarAllowed, FEATURE_CALENDAR } from "./calendarFlags";

describe("calendarAllowed", () => {
  it.each([
    [true, false, true],
    [true, true, false],
    [false, false, false],
    [false, true, false]
  ])("flag %s with study active %s gives %s", (flag, studyActive, expected) => {
    expect(calendarAllowed(flag, studyActive)).toBe(expected);
  });
});

describe("calendar flag default", () => {
  it("is on for the demo build", () => {
    expect(FEATURE_CALENDAR).toBe(true);
  });
});
