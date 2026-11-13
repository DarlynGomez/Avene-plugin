import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, FORMAT_CHOICES, normalizeSettings } from "./settings";

describe("the calendar settings in the study build", () => {
  it("offer the file only, and default to it", () => {
    expect(FORMAT_CHOICES).toEqual(["ics"]);
    expect(DEFAULT_SETTINGS.format).toBe("ics");
  });

  it("turn a stored Google choice into the file, and keep the other settings", () => {
    expect(normalizeSettings({ format: "google", trigger: 5, minutes: 30 })).toMatchObject({
      format: "ics",
      trigger: 5,
      minutes: 30
    });
  });
});
