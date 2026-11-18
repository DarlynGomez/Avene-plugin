import { describe, expect, it } from "vitest";

import { calendarAllowed, FEATURE_CALENDAR } from "../calendarFlags";
import { FEATURE_VARIABLE_SCOPE } from "../featureFlags";
import { FEATURE_MODULES, modulesAllowed } from "../moduleFlags";
import {
  altChecksAllowed,
  altLiveAllowed,
  annotationsAllowed,
  FEATURE_ALT_ANNOTATIONS,
  FEATURE_ALT_IN_STUDY,
  FEATURE_ALT_SUGGEST_LIVE,
  FEATURE_HANDOFF,
  handoffAllowed
} from "../handoffFlags";
import { isStudyActive, variableScopeAllowed } from "./studyActive";
import type { StudySession } from "./studyTypes";

const BASE: StudySession = {
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

const STATES: [string, StudySession | null, boolean][] = [
  ["no session", null, false],
  ["active block 1", { ...BASE }, true],
  ["active block 2", { ...BASE, block: 2, task: "B" }, true],
  ["block ended, not exited", { ...BASE, phase: "ended", endedAt: "t" }, true],
  ["post-task designing", { ...BASE, condition: "post-task", phase: "designing" }, true],
  ["exited", { ...BASE, phase: "ended", endedAt: "t", exitedAt: "t" }, false]
];

describe("which states count as a study", () => {
  it.each(STATES)("%s", (_name, session, active) => {
    expect(isStudyActive(session)).toBe(active);
  });
});

/** The build as it ships: each feature with its real flag, the gate and the flag both have to agree */
describe("features with the shipped flags", () => {
  it.each(STATES)("%s", (_name, session, active) => {
    const studyActive = isStudyActive(session);
    expect(handoffAllowed(FEATURE_HANDOFF, studyActive)).toBe(!active);
    expect(calendarAllowed(FEATURE_CALENDAR, studyActive)).toBe(!active);
    expect(annotationsAllowed(FEATURE_ALT_ANNOTATIONS, FEATURE_HANDOFF, studyActive)).toBe(false);
    expect(
      altLiveAllowed(FEATURE_ALT_SUGGEST_LIVE, handoffAllowed(FEATURE_HANDOFF, studyActive))
    ).toBe(!active);
    expect(variableScopeAllowed(FEATURE_VARIABLE_SCOPE, studyActive)).toBe(false);
    expect(modulesAllowed(FEATURE_MODULES, studyActive)).toBe(!active);
  });
});

/** With every flag forced on, only the session gate stands between a participant and the feature */
describe("features with every flag on", () => {
  it.each(STATES)("%s", (_name, session, active) => {
    const studyActive = isStudyActive(session);
    expect(handoffAllowed(true, studyActive)).toBe(!active);
    expect(calendarAllowed(true, studyActive)).toBe(!active);
    expect(annotationsAllowed(true, true, studyActive)).toBe(!active);
    expect(altLiveAllowed(true, handoffAllowed(true, studyActive))).toBe(!active);
    expect(variableScopeAllowed(true, studyActive)).toBe(!active);
    expect(modulesAllowed(true, studyActive)).toBe(!active);
  });
});

/** The alt text checks follow the feedback in a session, and handoff outside one */
describe("alt text checks", () => {
  it.each([
    ["no session", null, true],
    ["live designing", { ...BASE }, true],
    ["post-task designing", { ...BASE, condition: "post-task", phase: "designing" }, false],
    ["post-task reviewing", { ...BASE, condition: "post-task", phase: "reviewing" }, true],
    ["block ended, not exited", { ...BASE, phase: "ended", endedAt: "t" }, false],
    ["exited", { ...BASE, phase: "ended", endedAt: "t", exitedAt: "t" }, true]
  ] as [string, StudySession | null, boolean][])("%s", (_name, session, expected) => {
    expect(altChecksAllowed(FEATURE_HANDOFF, FEATURE_ALT_IN_STUDY, session)).toBe(expected);
    expect(altLiveAllowed(FEATURE_ALT_SUGGEST_LIVE, expected)).toBe(expected);
  });

  it("keeps them out of every session with the study flag off, and outside one with handoff off", () => {
    expect(altChecksAllowed(true, false, BASE)).toBe(false);
    expect(altChecksAllowed(false, true, null)).toBe(false);
    expect(altChecksAllowed(false, true, BASE)).toBe(true);
  });
});
