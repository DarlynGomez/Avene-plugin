import { describe, expect, it } from "vitest";

import { isCalibrationProfile } from "../calibrationSchema";
import { questions } from "../../ui/calibration/data/questions";
import { STUDY_ANSWERS, STUDY_AI_ASSISTANCE_LEVEL, buildStudyProfile } from "./studyProfile";
import type { StudySession } from "./studyTypes";

function session(patch: Partial<StudySession> = {}): StudySession {
  return {
    schemaVersion: 1,
    participantId: "P01",
    block: 1,
    task: "A",
    condition: "live",
    consentConfirmedAt: "2026-10-06T09:00:00.000Z",
    phase: "designing",
    startedAt: "2026-10-06T09:00:00.000Z",
    revealedAt: null,
    endedAt: null,
    exports: [],
    exitedAt: null,
    ...patch
  };
}

describe("study profile", () => {
  it("names exactly the questions calibration asks, so a new question forces a decision", () => {
    const asked = questions.filter((question) => question.enabled).map((question) => question.id);

    expect(Object.keys(STUDY_ANSWERS).sort()).toEqual([...asked].sort());
  });

  it("does not name the disabled questions", () => {
    expect(STUDY_ANSWERS).not.toHaveProperty("communityFocus");
    expect(STUDY_ANSWERS).not.toHaveProperty("teamReview");
  });

  it("states every answer as the spec fixes it", () => {
    expect(STUDY_ANSWERS).toEqual({
      projectType: "something-else",
      primaryAudience: "general-public",
      useEnvironments: [],
      otherTools: "none",
      accessibilityFamiliarity: "some-experience",
      explanationPreference: "explain-first",
      aiAssistanceLevel: 3
    });
  });

  it("uses only values the questions offer", () => {
    for (const question of questions.filter((q) => q.enabled)) {
      const answer = STUDY_ANSWERS[question.id];
      // A scale answer is saved as the position of the chosen option, counting from 1
      const allowed =
        question.type === "scale"
          ? question.options.map((_option, index) => index + 1)
          : question.options.map((option) => option.value);
      for (const value of Array.isArray(answer) ? answer : [answer]) {
        expect(allowed).toContain(value);
      }
    }
  });

  it("sets Explain and suggest fixes, the third level", () => {
    const level = questions.find((question) => question.id === "aiAssistanceLevel");

    expect(STUDY_AI_ASSISTANCE_LEVEL).toBe(3);
    expect(level?.options[2]?.label).toBe("Explain and suggest fixes");
  });

  it("builds a valid profile with logging consent on", () => {
    const profile = buildStudyProfile(session());

    expect(isCalibrationProfile(profile)).toBe(true);
    expect(profile.loggingConsent).toBe(true);
    expect(profile.completedAt).toBe("2026-10-06T09:00:00.000Z");
  });

  it("gives every participant and block the same answers", () => {
    const first = buildStudyProfile(
      session({ participantId: "P01", task: "A", condition: "live" })
    );
    const second = buildStudyProfile(
      session({ participantId: "P42", block: 2, task: "B", condition: "post-task" })
    );

    expect(second.answers).toEqual(first.answers);
  });
});
