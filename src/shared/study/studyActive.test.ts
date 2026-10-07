import { describe, expect, it } from "vitest";

import { isStudyActive, variableScopeAllowed } from "./studyActive";
import type { StudySession } from "./studyTypes";

const SESSION: StudySession = {
  schemaVersion: 1,
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  consentConfirmedAt: "t",
  phase: "designing",
  startedAt: "t",
  revealedAt: null,
  endedAt: null,
  exports: [],
  exitedAt: null
};

describe("isStudyActive", () => {
  it("is off with no session", () => {
    expect(isStudyActive(null)).toBe(false);
  });

  it.each(["designing", "reviewing", "ended"] as const)("is on while the phase is %s", (phase) => {
    expect(isStudyActive({ ...SESSION, phase })).toBe(true);
  });

  it("is off once the researcher has exited", () => {
    expect(isStudyActive({ ...SESSION, exitedAt: "t" })).toBe(false);
  });
});

describe("variableScopeAllowed", () => {
  it.each([
    [true, false, true],
    [true, true, false],
    [false, false, false],
    [false, true, false]
  ])("flag %s with study active %s gives %s", (flag, active, expected) => {
    expect(variableScopeAllowed(flag, active)).toBe(expected);
  });
});
