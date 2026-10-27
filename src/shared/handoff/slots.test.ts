import { describe, expect, it } from "vitest";

import { createSlots, fillSlots } from "./slots";

describe("slots", () => {
  it("numbers by prefix and reuses an id for the same value", () => {
    const slots = createSlots();
    expect(slots.auto("L", "Title")).toBe("{L1}");
    expect(slots.auto("L", "Body")).toBe("{L2}");
    expect(slots.auto("L", "Title")).toBe("{L1}");
    expect(slots.put("n_action", 3)).toBe("{n_action}");
    expect(slots.table()).toEqual({ L1: "Title", L2: "Body", n_action: "3" });
  });

  it("fills known ids and leaves unknown ones", () => {
    expect(fillSlots("{a} and {b}", { a: "x" })).toBe("x and {b}");
  });
});
