import { describe, expect, it } from "vitest";

import { FEATURE_HANDOFF, handoffAllowed } from "./handoffFlags";

describe("handoffAllowed", () => {
  it.each([
    [true, false, true],
    [true, true, false],
    [false, false, false],
    [false, true, false]
  ])("flag %s with study active %s gives %s", (flag, studyActive, expected) => {
    expect(handoffAllowed(flag, studyActive)).toBe(expected);
  });
});

describe("handoff flag in the demo build", () => {
  it("is on, and only this branch has it on", () => {
    expect(FEATURE_HANDOFF).toBe(true);
  });
});
