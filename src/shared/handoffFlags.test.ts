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

describe("handoff flag default", () => {
  it("is off unless a demo build or test turns it on", () => {
    expect(FEATURE_HANDOFF).toBe(false);
  });
});
