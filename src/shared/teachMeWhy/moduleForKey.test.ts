import { describe, expect, it } from "vitest";

import { ELEMENT_ROLES } from "./explanationTypes";
import { moduleForKey } from "./moduleForKey";
import { LEARNING_MODULES } from "./modules/modules";

describe("moduleForKey", () => {
  it.each([
    ["decorative", "normal", "M06"],
    ["decorative", "large", "M06"],
    ["unknown", "normal", "M01"],
    ["unknown", "large", "M01"],
    ["body", "normal", "M01"],
    ["caption", "normal", "M01"],
    ["label", "normal", "M01"],
    ["button text", "normal", "M01"],
    ["heading", "normal", "M01"],
    ["body", "large", "M04"],
    ["heading", "large", "M04"],
    ["label", "large", "M04"],
    ["button text", "large", "M04"]
  ] as const)("%s at %s size opens %s", (role, size, expected) => {
    expect(moduleForKey({ role, size })).toBe(expected);
  });

  it("only ever returns M01, M04 or M06, never M08, M09, M10 or M11, and each is a lesson", () => {
    const reached = new Set<string>();
    for (const role of ELEMENT_ROLES) {
      for (const size of ["normal", "large"] as const) reached.add(moduleForKey({ role, size }));
    }
    expect([...reached].sort()).toEqual(["M01", "M04", "M06"]);
    for (const id of reached) expect(LEARNING_MODULES.some((m) => m.id === id)).toBe(true);
  });

  it("reaches only lessons with no open review flag", () => {
    for (const id of ["M01", "M04", "M06"]) {
      expect(LEARNING_MODULES.find((m) => m.id === id)?.reviewFlags, id).toEqual([]);
    }
  });
});
