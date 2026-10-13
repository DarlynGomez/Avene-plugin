import { describe, expect, it } from "vitest";

import { isStudyActive, markersAllowed, variableScopeAllowed } from "./studyActive";
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

describe("markersAllowed", () => {
  const session = (patch: Partial<StudySession>): StudySession => ({ ...SESSION, ...patch });

  it("follows the flag when there is no session", () => {
    expect(markersAllowed(false, null)).toBe(false);
    expect(markersAllowed(true, null)).toBe(true);
  });

  it.each([
    ["live designing", { condition: "live", phase: "designing" }, true],
    ["post-task designing", { condition: "post-task", phase: "designing" }, false],
    ["post-task reviewing", { condition: "post-task", phase: "reviewing" }, true],
    ["live ended", { condition: "live", phase: "ended" }, false],
    ["post-task ended", { condition: "post-task", phase: "ended" }, false]
  ] as const)(
    "in a session at %s the phase decides, whatever the flag says",
    (_name, patch, shown) => {
      expect(markersAllowed(false, session(patch))).toBe(shown);
      expect(markersAllowed(true, session(patch))).toBe(shown);
    }
  );

  it("goes back to the flag once the researcher has exited", () => {
    const exited = session({ exitedAt: "t" });

    expect(markersAllowed(false, exited)).toBe(false);
    expect(markersAllowed(true, exited)).toBe(true);
  });
});
