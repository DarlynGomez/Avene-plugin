import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, initialsOf, normalizeSettings } from "./settings";

describe("normalizeSettings", () => {
  it("keeps good values", () => {
    const given = { format: "ics", trigger: "off", minutes: 15, slot: "custom" };
    expect(normalizeSettings(given)).toEqual(given);
    expect(
      normalizeSettings({ ...given, trigger: 5, minutes: 30, slot: "afternoon" })
    ).toMatchObject({
      trigger: 5,
      minutes: 30,
      slot: "afternoon"
    });
  });

  it.each([null, undefined, "text", 4, [], {}])("falls back to the defaults for %j", (raw) => {
    expect(normalizeSettings(raw)).toEqual(DEFAULT_SETTINGS);
  });

  it("checks each field alone, so one bad value keeps the rest", () => {
    expect(normalizeSettings({ format: "fax", trigger: 5, minutes: 20, slot: "night" })).toEqual({
      ...DEFAULT_SETTINGS,
      trigger: 5
    });
  });

  it("does not take a trigger or length that is a string of a number", () => {
    expect(normalizeSettings({ trigger: "3", minutes: "45" })).toEqual(DEFAULT_SETTINGS);
  });
});

describe("initialsOf", () => {
  it("is the first letter of the first and last word", () => {
    expect(initialsOf("Darlyn Gomez")).toBe("DG");
    expect(initialsOf("  ada   king lovelace ")).toBe("AL");
  });

  it("is one letter for one word and nothing for no name", () => {
    expect(initialsOf("Cher")).toBe("C");
    expect(initialsOf("")).toBe("");
    expect(initialsOf(null)).toBe("");
  });
});
