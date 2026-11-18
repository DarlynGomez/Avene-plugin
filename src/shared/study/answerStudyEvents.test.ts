import { describe, expect, it } from "vitest";

import { buildAltAnswered, buildAltSuggestionRequested } from "./answerStudyEvents";
import type { StudyEventContext } from "./studyEvents";
import { studyEventProblem } from "./studyEventSchema";

const CTX: StudyEventContext = {
  participantId: "P01",
  block: 2,
  task: "B",
  condition: "post-task",
  phase: "reviewing"
};
const AT = "2026-11-18T10:00:00.000Z";

describe("alt answered", () => {
  it.each([
    [
      "the participant's own words",
      { text: "A map", decorative: false, source: "designer" },
      false
    ],
    ["a suggestion kept", { text: "A map", decorative: false, source: "ai" }, false],
    ["marked decorative", { text: "", decorative: true, source: "designer" }, false],
    ["a note taken away", { text: "  ", decorative: false, source: "designer" }, true]
  ] as const)("records %s without the words", (_name, answer, cleared) => {
    const event = buildAltAnswered(CTX, AT, "9:1", answer);
    expect(event).toEqual({
      type: "alt_answered",
      at: AT,
      ctx: CTX,
      nodeId: "9:1",
      decorative: answer.decorative,
      source: answer.source,
      cleared
    });
    expect(studyEventProblem(event)).toBeNull();
  });

  it("refuses a stored event with an unknown source or a missing field", () => {
    const event = buildAltAnswered(CTX, AT, "9:1", { text: "", decorative: true, source: "ai" });
    expect(studyEventProblem({ ...event, source: "model" })).not.toBeNull();
    expect(studyEventProblem({ ...event, cleared: undefined })).not.toBeNull();
  });
});

describe("alt suggestion requested", () => {
  it("names the layer and nothing else", () => {
    const event = buildAltSuggestionRequested(CTX, AT, "9:1");
    expect(event).toEqual({ type: "alt_suggestion_requested", at: AT, ctx: CTX, nodeId: "9:1" });
    expect(studyEventProblem(event)).toBeNull();
    expect(studyEventProblem({ ...event, nodeId: 4 })).not.toBeNull();
  });
});
