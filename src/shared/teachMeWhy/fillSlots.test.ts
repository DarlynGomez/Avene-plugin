import { describe, expect, it } from "vitest";
import { fillSlots, slotValues } from "./fillSlots";

describe("slotValues", () => {
  it("formats the way the panel does", () => {
    expect(slotValues(2.1739, 4.5)).toEqual({ measured: "2.17:1", required: "4.5:1" });
    expect(slotValues(3.29, 3)).toEqual({ measured: "3.29:1", required: "3:1" });
    expect(slotValues(4, 4.5).measured).toBe("4.00:1");
  });
});

describe("fillSlots", () => {
  it("fills every placeholder", () => {
    expect(fillSlots("{measured} needs {required}, {measured} again", 2.17, 4.5)).toBe(
      "2.17:1 needs 4.5:1, 2.17:1 again"
    );
  });
  it("leaves text without placeholders and unknown ones alone", () => {
    expect(fillSlots("Nothing {other} here", 2, 3)).toBe("Nothing {other} here");
  });
});
