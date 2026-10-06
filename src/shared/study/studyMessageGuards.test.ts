import { describe, expect, it } from "vitest";

import { participantVisibility } from "./participantVisibility";
import { isStudyMessage, isStudyStateMessage } from "./studyMessageGuards";

const START = {
  type: "STUDY_START_BLOCK",
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  paperConsentSigned: true
};

describe("isStudyMessage", () => {
  it.each(["STUDY_REVEAL", "STUDY_END_BLOCK", "STUDY_EXIT"])(
    "accepts %s with no fields",
    (type) => {
      expect(isStudyMessage({ type })).toBe(true);
    }
  );

  it("accepts a complete start message", () => {
    expect(isStudyMessage(START)).toBe(true);
  });

  it("accepts a start message with wrong values so the sandbox can refuse with a reason", () => {
    expect(isStudyMessage({ ...START, task: "Z", block: 9, participantId: "" })).toBe(true);
  });

  it.each([
    ["participantId", 5],
    ["block", "1"],
    ["task", 1],
    ["condition", null],
    ["paperConsentSigned", "true"]
  ])("refuses a start message with a %s of the wrong type", (field, value) => {
    expect(isStudyMessage({ ...START, [field]: value })).toBe(false);
  });

  it.each(["participantId", "block", "task", "condition", "paperConsentSigned"])(
    "refuses a start message missing %s",
    (field) => {
      const rest = Object.fromEntries(Object.entries(START).filter(([key]) => key !== field));

      expect(isStudyMessage(rest)).toBe(false);
    }
  );

  it.each([
    null,
    undefined,
    "STUDY_EXIT",
    4,
    [],
    {},
    { type: "STUDY_STATE" },
    { type: "ISSUES_SUBSCRIBE" }
  ])("refuses %j", (value) => {
    expect(isStudyMessage(value)).toBe(false);
  });
});

describe("isStudyStateMessage", () => {
  const state = {
    type: "STUDY_STATE",
    session: null,
    visibility: participantVisibility(null),
    refusal: null
  };

  it("accepts no session with unrestricted visibility", () => {
    expect(isStudyStateMessage(state)).toBe(true);
  });

  it("accepts a refusal", () => {
    const refusal = { code: "not-fresh", reason: "No." };

    expect(isStudyStateMessage({ ...state, refusal })).toBe(true);
  });

  it("refuses a malformed session", () => {
    expect(isStudyStateMessage({ ...state, session: { participantId: "P01" } })).toBe(false);
  });

  it("refuses visibility with a missing or non boolean flag", () => {
    expect(
      isStudyStateMessage({ ...state, visibility: { ...state.visibility, issueList: "yes" } })
    ).toBe(false);
    expect(isStudyStateMessage({ ...state, visibility: {} })).toBe(false);
  });

  it("refuses a malformed refusal and a wrong type", () => {
    expect(isStudyStateMessage({ ...state, refusal: { code: 1 } })).toBe(false);
    expect(isStudyStateMessage({ ...state, type: "STUDY_START_BLOCK" })).toBe(false);
    expect(isStudyStateMessage(null)).toBe(false);
  });
});
