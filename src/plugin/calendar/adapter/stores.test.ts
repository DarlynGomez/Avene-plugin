import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { recordDeferral } from "../../../shared/calendar/deferrals";
import { DEFAULT_SETTINGS } from "../../../shared/calendar/settings";
import { buildTree } from "../../roles/testing/fakeFigma";
import { KEY_CALENDAR_SETTINGS, KEY_DEFERRALS } from "../calendarKeys";
import { loadDeferrals, saveDeferrals } from "./deferralStore";
import { currentUserName, loadCalendarSettings, saveCalendarSettings } from "./settingsStore";

const AT = "2026-11-03T10:00:00.000Z";
let user: Map<string, unknown>;

beforeEach(() => {
  buildTree();
  user = new Map();
  Object.assign(figma, {
    clientStorage: {
      getAsync: (key: string) => Promise.resolve(user.get(key)),
      setAsync: (key: string, value: unknown) => Promise.resolve(void user.set(key, value))
    },
    currentUser: { name: "Darlyn Gomez" }
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("deferral store", () => {
  it("round trips through the file", () => {
    expect(loadDeferrals()).toEqual({});
    const map = recordDeferral({}, "a|b", AT);
    expect(saveDeferrals(map)).toEqual({ saved: true });
    expect(loadDeferrals()).toEqual(map);
  });

  it("clears the entry when nothing is counted, and reads broken data as nothing", () => {
    saveDeferrals(recordDeferral({}, "a|b", AT));
    saveDeferrals({});
    expect(figma.root.getPluginData(KEY_DEFERRALS)).toBe("");
    figma.root.setPluginData(KEY_DEFERRALS, "{broken");
    expect(loadDeferrals()).toEqual({});
  });

  it("refuses a map that is too large and keeps the old one", () => {
    const kept = recordDeferral({}, "a|b", AT);
    saveDeferrals(kept);
    let huge = {};
    for (let i = 0; i < 2000; i += 1)
      huge = recordDeferral(huge, `#${100000 + i}|#FFFFFF|text/a-long-token-name-${i}|4.5`, AT);
    expect(saveDeferrals(huge).saved).toBe(false);
    expect(loadDeferrals()).toEqual(kept);
  });

  it("reports a platform failure without throwing", () => {
    (figma.root as unknown as { setPluginData: () => void }).setPluginData = () => {
      throw new Error("no write");
    };
    expect(saveDeferrals(recordDeferral({}, "a|b", AT))).toEqual({
      saved: false,
      error: "no write"
    });
  });
});

describe("settings store", () => {
  it("gives the defaults before anything is saved", async () => {
    expect(await loadCalendarSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps settings with the user and not in the file", async () => {
    const settings = { ...DEFAULT_SETTINGS, trigger: 5 as const, format: "ics" as const };
    expect(await saveCalendarSettings(settings)).toBe(true);
    expect(await loadCalendarSettings()).toEqual(settings);
    expect(user.has(KEY_CALENDAR_SETTINGS)).toBe(true);
    expect(figma.root.getPluginData(KEY_CALENDAR_SETTINGS)).toBe("");
  });

  it("makes stored values safe and survives a failing store", async () => {
    user.set(KEY_CALENDAR_SETTINGS, { trigger: 99, minutes: 30 });
    expect(await loadCalendarSettings()).toEqual({ ...DEFAULT_SETTINGS, minutes: 30 });
    (figma.clientStorage as unknown as { getAsync: () => Promise<never> }).getAsync = () =>
      Promise.reject(new Error("x"));
    expect(await loadCalendarSettings()).toEqual(DEFAULT_SETTINGS);
    (figma.clientStorage as unknown as { setAsync: () => Promise<never> }).setAsync = () =>
      Promise.reject(new Error("x"));
    expect(await saveCalendarSettings(DEFAULT_SETTINGS)).toBe(false);
  });
});

describe("currentUserName", () => {
  it("is the name, or nothing when the user is not known", () => {
    expect(currentUserName()).toBe("Darlyn Gomez");
    Object.assign(figma, { currentUser: null });
    expect(currentUserName()).toBeNull();
  });
});
