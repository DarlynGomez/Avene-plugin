import { describe, expect, it } from "vitest";

import {
  FEATURE_ALT_ANNOTATIONS,
  FEATURE_HANDOFF,
  annotationsAllowed,
  handoffAllowed
} from "./handoffFlags";

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

describe("annotationsAllowed", () => {
  it.each([
    [true, true, false, true],
    [true, true, true, false],
    [true, false, false, false],
    [true, false, true, false],
    [false, true, false, false],
    [false, true, true, false],
    [false, false, false, false],
    [false, false, true, false]
  ])(
    "annotation flag %s, handoff flag %s, study active %s gives %s",
    (annotationFlag, handoffFlag, studyActive, expected) => {
      expect(annotationsAllowed(annotationFlag, handoffFlag, studyActive)).toBe(expected);
    }
  );
});

describe("annotation flag default", () => {
  it("is off until the write has been checked in Figma", () => {
    expect(FEATURE_ALT_ANNOTATIONS).toBe(false);
  });
});
