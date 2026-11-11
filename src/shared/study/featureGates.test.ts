import { describe, expect, it } from "vitest";

import { calendarAllowed, FEATURE_CALENDAR } from "../calendarFlags";
import { FEATURE_VARIABLE_SCOPE } from "../featureFlags";
import {
  altLiveAllowed,
  annotationsAllowed,
  FEATURE_ALT_ANNOTATIONS,
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
    expect(altLiveAllowed(FEATURE_ALT_SUGGEST_LIVE, FEATURE_HANDOFF, studyActive)).toBe(false);
    expect(variableScopeAllowed(FEATURE_VARIABLE_SCOPE, studyActive)).toBe(false);
  });
});

/** With every flag forced on, only the session gate stands between a participant and the feature */
describe("features with every flag on", () => {
  it.each(STATES)("%s", (_name, session, active) => {
    const studyActive = isStudyActive(session);
    expect(handoffAllowed(true, studyActive)).toBe(!active);
    expect(calendarAllowed(true, studyActive)).toBe(!active);
    expect(annotationsAllowed(true, true, studyActive)).toBe(!active);
    expect(altLiveAllowed(true, true, studyActive)).toBe(!active);
    expect(variableScopeAllowed(true, studyActive)).toBe(!active);
  });
});
