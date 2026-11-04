import { describe, expect, it } from "vitest";

import { isCalendarPluginMessage, isCalendarUiMessage, settingsOf } from "./calendarMessages";
import { DEFAULT_SETTINGS } from "./settings";

describe("isCalendarUiMessage", () => {
  it.each([
    { type: "CALENDAR_STATE_REQUEST", live: [] },
    { type: "CALENDAR_STATE_REQUEST", live: ["a|b"] },
    { type: "CALENDAR_DEFERRED", signature: "a|b" },
    { type: "CALENDAR_SCHEDULED", signatures: ["a|b"] },
    { type: "CALENDAR_SETTINGS_SET", settings: DEFAULT_SETTINGS },
    { type: "CALENDAR_OPEN_URL", url: "https://calendar.google.com/calendar/render?x=1" },
    { type: "CALENDAR_RESET" }
  ])("accepts %j", (message) => {
    expect(isCalendarUiMessage(message)).toBe(true);
  });

  it.each([
    null,
    "CALENDAR_RESET",
    { type: "CALENDAR_STATE_REQUEST" },
    { type: "CALENDAR_STATE_REQUEST", live: [1] },
    { type: "CALENDAR_DEFERRED" },
    { type: "CALENDAR_DEFERRED", signature: "" },
    { type: "CALENDAR_SCHEDULED", signatures: "a" },
    { type: "CALENDAR_SETTINGS_SET", settings: "x" },
    { type: "CALENDAR_OPEN_URL", url: 4 },
    { type: "HANDOFF_DATA_REQUEST" }
  ])("refuses %j", (message) => {
    expect(isCalendarUiMessage(message)).toBe(false);
  });
});

describe("isCalendarPluginMessage", () => {
  const state = {
    type: "CALENDAR_STATE",
    settings: DEFAULT_SETTINGS,
    counts: {},
    userName: null,
    fileUrl: null
  };

  it("accepts a state and a refusal and nothing else", () => {
    expect(isCalendarPluginMessage(state)).toBe(true);
    expect(
      isCalendarPluginMessage({ ...state, userName: "Darlyn Gomez", fileUrl: "https://x" })
    ).toBe(true);
    expect(isCalendarPluginMessage({ type: "CALENDAR_REFUSED" })).toBe(true);
    expect(isCalendarPluginMessage({ ...state, counts: null })).toBe(false);
    expect(isCalendarPluginMessage({ ...state, userName: 4 })).toBe(false);
    expect(isCalendarPluginMessage({ type: "HANDOFF_REFUSED" })).toBe(false);
    expect(isCalendarPluginMessage(undefined)).toBe(false);
  });
});

describe("settingsOf", () => {
  it("makes the settings of a state safe", () => {
    const bad = {
      type: "CALENDAR_STATE",
      settings: { trigger: 7 },
      counts: {},
      userName: null,
      fileUrl: null
    } as const;
    expect(settingsOf(bad as never)).toEqual(DEFAULT_SETTINGS);
  });
});
