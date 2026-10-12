import { describe, expect, it } from "vitest";

import { LIVE_CTX, T } from "./studyEventFixtures";
import { isStudyEvent, studyEventProblem } from "./studyEventSchema";

const VALID = {
  type: "issue_action",
  at: T,
  ctx: LIVE_CTX,
  action: "defer",
  target: { kind: "issue", issueId: "contrast:1:1" },
  instanceCount: 1,
  resultingState: "deferred"
};

describe("studyEventProblem", () => {
  it("accepts a valid event", () => {
    expect(studyEventProblem(VALID)).toBeNull();
  });

  it.each([null, undefined, "x", 5, [], {}])("refuses %j", (value) => {
    expect(isStudyEvent(value)).toBe(false);
  });

  it("refuses an unknown type", () => {
    expect(studyEventProblem({ ...VALID, type: "nope" })).toBe("the event type is not known");
  });

  it("refuses a missing time", () => {
    expect(studyEventProblem({ ...VALID, at: undefined })).toBe("the event has no time");
  });

  it.each([
    ["participantId", { participantId: "a b" }],
    ["block", { block: 3 }],
    ["task", { task: "C" }],
    ["condition", { condition: "x" }],
    ["phase", { phase: "done" }]
  ])("refuses a bad context %s", (_field, patch) => {
    expect(studyEventProblem({ ...VALID, ctx: { ...LIVE_CTX, ...patch } })).toBe(
      "the event context is not valid"
    );
  });

  it("refuses a missing context", () => {
    expect(isStudyEvent({ ...VALID, ctx: undefined })).toBe(false);
  });

  it.each([
    ["action", { action: "explode" }],
    ["target", { target: { kind: "root" } }],
    ["target", { target: { kind: "other", issueId: "x" } }],
    ["instanceCount", { instanceCount: "1" }],
    ["resultingState", { resultingState: "gone" }],
    ["fromDecisionOffer", { fromDecisionOffer: "yes" }]
  ])("refuses an issue_action with a bad %s", (_field, patch) => {
    expect(isStudyEvent({ ...VALID, ...patch })).toBe(false);
  });

  it("checks each type's own fields", () => {
    expect(isStudyEvent({ type: "block_started", at: T, ctx: LIVE_CTX })).toBe(false);
    expect(isStudyEvent({ type: "marker_state", at: T, ctx: LIVE_CTX, markersOn: "on" })).toBe(
      false
    );
    const marker = {
      type: "marker_state",
      at: T,
      ctx: LIVE_CTX,
      markersOn: true,
      markerCount: 2,
      style: "ring"
    };
    expect(isStudyEvent({ ...marker, change: "shown" })).toBe(true);
    expect(isStudyEvent({ ...marker, change: "screen_changed" })).toBe(true);
    expect(isStudyEvent({ ...marker, change: "moved" })).toBe(false);
    expect(isStudyEvent({ ...marker, change: "shown", markerCount: "2" })).toBe(false);
    expect(isStudyEvent({ ...marker, change: "shown", style: "square" })).toBe(false);
    expect(isStudyEvent({ ...marker, change: "shown", style: undefined })).toBe(false);
    expect(isStudyEvent({ type: "feedback_revealed", at: T, ctx: LIVE_CTX })).toBe(true);
    expect(
      isStudyEvent({
        type: "block_ended",
        at: T,
        ctx: LIVE_CTX,
        part: { index: 0, of: 1 },
        issues: [{ id: "a", state: "open", severity: "low" }]
      })
    ).toBe(true);
    expect(
      isStudyEvent({
        type: "block_ended",
        at: T,
        ctx: LIVE_CTX,
        part: { index: 0, of: 1 },
        issues: [{ id: "a", state: "open", severity: "huge" }]
      })
    ).toBe(false);
  });
});
