import { describe, expect, it } from "vitest";

import { isStudySession, studySessionProblem } from "./studySessionSchema";

const VALID = {
  schemaVersion: 1,
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "post-task",
  consentConfirmedAt: "2026-10-06T09:00:00.000Z",
  phase: "designing",
  startedAt: "2026-10-06T09:00:00.000Z",
  revealedAt: null,
  endedAt: null,
  exports: [],
  exitedAt: null
};

describe("studySessionProblem", () => {
  it("accepts a designing post-task session", () => {
    expect(studySessionProblem(VALID)).toBeNull();
  });

  it("accepts a reviewing post-task session with a reveal time", () => {
    const reviewing = { ...VALID, phase: "reviewing", revealedAt: "2026-10-06T09:20:00.000Z" };

    expect(isStudySession(reviewing)).toBe(true);
  });

  it("accepts an ended live session that was exported and exited", () => {
    const ended = {
      ...VALID,
      condition: "live",
      phase: "ended",
      endedAt: "2026-10-06T09:20:00.000Z",
      exports: ["2026-10-06T09:21:00.000Z"],
      exitedAt: "2026-10-06T09:22:00.000Z"
    };

    expect(isStudySession(ended)).toBe(true);
  });

  it.each([null, undefined, "text", 5, [], true])("refuses %j", (value) => {
    expect(isStudySession(value)).toBe(false);
  });

  it.each([
    ["schemaVersion", { schemaVersion: 2 }],
    ["participantId", { participantId: "a b" }],
    ["block", { block: 3 }],
    ["task", { task: "C" }],
    ["condition", { condition: "Live" }],
    ["phase", { phase: "done" }],
    ["consentConfirmedAt", { consentConfirmedAt: 5 }],
    ["startedAt", { startedAt: undefined }],
    ["revealedAt", { revealedAt: 5 }],
    ["exports", { exports: "x" }],
    ["exports", { exports: [1] }]
  ])("refuses a bad %s", (_field, patch) => {
    expect(isStudySession({ ...VALID, ...patch })).toBe(false);
  });

  it.each([
    ["a live block with a reveal time", { condition: "live", revealedAt: "t" }],
    ["reviewing with no reveal time", { phase: "reviewing" }],
    ["reviewing in a live block", { condition: "live", phase: "reviewing", revealedAt: "t" }],
    ["ended with no end time", { phase: "ended" }],
    ["an end time while designing", { endedAt: "t" }]
  ])("refuses %s", (_name, patch) => {
    expect(isStudySession({ ...VALID, ...patch })).toBe(false);
  });

  it("says why", () => {
    expect(studySessionProblem({ ...VALID, task: "C" })).toBe("the task is not A or B");
  });
});
