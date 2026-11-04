import { describe, expect, it } from "vitest";

import { FILE_URL, item } from "./fixtures";
import { DEFAULT_SETTINGS } from "./settings";
import { buildEvent, dueItems, isDue, sessionMinutes, thresholdOf } from "./suggest";

describe("isDue", () => {
  it.each([
    [2, 3, false],
    [3, 3, true],
    [4, 3, true],
    [4, 5, false],
    [5, 5, true]
  ] as const)("count %i with trigger %i gives %s", (count, trigger, expected) => {
    expect(isDue(count, trigger)).toBe(expected);
  });

  it("never fires when the trigger is off", () => {
    expect(isDue(99, "off")).toBe(false);
    expect(thresholdOf("off")).toBeNull();
    expect(thresholdOf(3)).toBe(3);
  });
});

describe("dueItems", () => {
  const items = [
    item({ signature: "a", deferCount: 3 }),
    item({ signature: "b", deferCount: 1 }),
    item({ signature: "c", deferCount: 5 })
  ];

  it("keeps the roots at or over the trigger", () => {
    expect(dueItems(items, 3).map((i) => i.signature)).toEqual(["a", "c"]);
    expect(dueItems(items, 5).map((i) => i.signature)).toEqual(["c"]);
    expect(dueItems(items, "off")).toEqual([]);
  });
});

describe("sessionMinutes", () => {
  it("is a short look for one root and the chosen length for several", () => {
    expect(sessionMinutes(1, DEFAULT_SETTINGS)).toBe(15);
    expect(sessionMinutes(2, DEFAULT_SETTINGS)).toBe(45);
    expect(sessionMinutes(4, { ...DEFAULT_SETTINGS, minutes: 30 })).toBe(30);
    expect(sessionMinutes(0, DEFAULT_SETTINGS)).toBe(15);
  });
});

describe("buildEvent", () => {
  const start = new Date(2026, 10, 3, 10, 0);

  it("is a single triage of fifteen minutes with the item and its link", () => {
    const event = buildEvent([item()], start, DEFAULT_SETTINGS, FILE_URL);
    expect(event.title).toBe("Design Review: A11y Triage (1 item)");
    expect(event.end).toEqual(new Date(2026, 10, 3, 10, 15));
    expect(event.body).toContain("sage/muted on white");
    expect(event.link).toContain("node-id=12-34");
  });

  it("is a batch of the chosen length for several roots", () => {
    const event = buildEvent(
      [item(), item({ signature: "b", name: "teal on mint" })],
      start,
      DEFAULT_SETTINGS
    );
    expect(event.title).toBe("Design Review: Batch A11y Triage (2 items)");
    expect(event.end).toEqual(new Date(2026, 10, 3, 10, 45));
    expect(event.link).toBeNull();
  });
});
