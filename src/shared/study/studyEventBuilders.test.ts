import { describe, expect, it } from "vitest";

import {
  MAX_REASON_CHARS,
  buildAdjustEvent,
  buildBlockEnded,
  buildBlockStarted,
  buildExplanationOpened,
  buildFeedbackRevealed,
  buildIssueAction,
  buildIssueFirstDetected,
  buildIssueFirstResponse,
  buildMarkerState,
  buildReasonWritten,
  buildRoleAnswered,
  contextFromSession,
  isFeedbackVisible
} from "./studyEventBuilders";
import { isStudyEvent } from "./studyEventSchema";
import {
  LIVE_CTX,
  POST_DESIGNING_CTX,
  POST_REVIEWING_CTX,
  T,
  sessionFor
} from "./studyEventFixtures";
import type { SnapshotRow } from "./studyEvents";

const rows = (count: number): SnapshotRow[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `contrast:1:${i}`,
    state: "open",
    severity: "low"
  }));

describe("contextFromSession", () => {
  it("copies who and where, and the phase, and nothing else", () => {
    expect(contextFromSession({ ...sessionFor(LIVE_CTX), phase: "reviewing" })).toEqual({
      ...LIVE_CTX,
      phase: "reviewing"
    });
  });
});

describe("isFeedbackVisible", () => {
  it.each([
    [LIVE_CTX, true],
    [POST_DESIGNING_CTX, false],
    [POST_REVIEWING_CTX, true],
    [{ ...LIVE_CTX, phase: "ended" as const }, false],
    [{ ...POST_REVIEWING_CTX, phase: "ended" as const }, false]
  ])("is %j visible: %s", (ctx, expected) => {
    expect(isFeedbackVisible(ctx)).toBe(expected);
  });
});

describe("block events", () => {
  it("builds block_started with the profile version and the context", () => {
    expect(buildBlockStarted(LIVE_CTX, T, 1)).toEqual({
      type: "block_started",
      at: T,
      ctx: LIVE_CTX,
      studyProfileVersion: 1
    });
  });

  it("builds feedback_revealed", () => {
    expect(buildFeedbackRevealed(POST_REVIEWING_CTX, T)).toEqual({
      type: "feedback_revealed",
      at: T,
      ctx: POST_REVIEWING_CTX
    });
  });

  it("builds a one part block_ended for a small snapshot", () => {
    const events = buildBlockEnded(LIVE_CTX, T, rows(3));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ part: { index: 0, of: 1 } });
    expect(events[0]?.issues).toHaveLength(3);
  });

  it("still records the end when the file has no issues", () => {
    const events = buildBlockEnded(LIVE_CTX, T, []);

    expect(events).toHaveLength(1);
    expect(events[0]?.issues).toEqual([]);
  });

  it("splits a large snapshot into parts that together hold every row once", () => {
    const events = buildBlockEnded(LIVE_CTX, T, rows(1000), 400);

    expect(events.map((event) => event.part)).toEqual([
      { index: 0, of: 3 },
      { index: 1, of: 3 },
      { index: 2, of: 3 }
    ]);
    expect(events.flatMap((event) => event.issues.map((row) => row.id))).toEqual(
      rows(1000).map((row) => row.id)
    );
  });

  it("splits at the exact boundary without an empty part", () => {
    expect(buildBlockEnded(LIVE_CTX, T, rows(800), 400)).toHaveLength(2);
    expect(buildBlockEnded(LIVE_CTX, T, rows(801), 400)).toHaveLength(3);
  });
});

describe("issue_first_detected", () => {
  const issue = { id: "contrast:1:1", severity: "high" as const };

  it("builds the first time an issue appears", () => {
    expect(buildIssueFirstDetected(LIVE_CTX, T, issue, new Set())).toEqual({
      type: "issue_first_detected",
      at: T,
      ctx: LIVE_CTX,
      issueId: "contrast:1:1",
      severity: "high",
      startingIssue: false
    });
  });

  it("marks an issue that was already in the file at Start", () => {
    expect(buildIssueFirstDetected(LIVE_CTX, T, issue, new Set(), true)?.startingIssue).toBe(true);
  });

  it("builds nothing for an issue already seen", () => {
    expect(buildIssueFirstDetected(LIVE_CTX, T, issue, new Set(["contrast:1:1"]))).toBeNull();
  });

  it("is built in post-task designing, detection is recorded exactly as live", () => {
    expect(buildIssueFirstDetected(POST_DESIGNING_CTX, T, issue, new Set())).not.toBeNull();
  });
});

describe("issue_first_response", () => {
  const action = { kind: "action", via: "defer" } as const;

  it("builds the first participant action on an issue", () => {
    expect(buildIssueFirstResponse(LIVE_CTX, T, "contrast:1:1", action, new Set())).toEqual({
      type: "issue_first_response",
      at: T,
      ctx: LIVE_CTX,
      issueId: "contrast:1:1",
      via: "defer"
    });
  });

  it.each([
    "defer",
    "pin",
    "unpin",
    "ignore",
    "reopen",
    "restore_deferred",
    "show_on_canvas",
    "locate",
    "adjust"
  ] as const)("counts %s as a response", (via) => {
    expect(
      buildIssueFirstResponse(LIVE_CTX, T, "contrast:1:1", { kind: "action", via }, new Set())?.via
    ).toBe(via);
  });

  it("builds nothing for a second response", () => {
    expect(
      buildIssueFirstResponse(LIVE_CTX, T, "contrast:1:1", action, new Set(["contrast:1:1"]))
    ).toBeNull();
  });

  it("counts a participant selecting the layer on the canvas", () => {
    const event = buildIssueFirstResponse(
      LIVE_CTX,
      T,
      "contrast:1:1",
      { kind: "selection", origin: "participant" },
      new Set()
    );

    expect(event?.via).toBe("selected_on_canvas");
  });

  it("never builds one from a selection the plugin made", () => {
    for (const ctx of [LIVE_CTX, POST_REVIEWING_CTX]) {
      expect(
        buildIssueFirstResponse(
          ctx,
          T,
          "contrast:1:1",
          { kind: "selection", origin: "plugin" },
          new Set()
        )
      ).toBeNull();
    }
  });

  it("still counts the click that asked the plugin to select, as an action", () => {
    expect(
      buildIssueFirstResponse(
        LIVE_CTX,
        T,
        "contrast:1:1",
        { kind: "action", via: "show_on_canvas" },
        new Set()
      )
    ).not.toBeNull();
  });

  it("builds nothing while feedback is withheld, whatever the participant does", () => {
    for (const trigger of [action, { kind: "selection", origin: "participant" }] as const) {
      expect(
        buildIssueFirstResponse(POST_DESIGNING_CTX, T, "contrast:1:1", trigger, new Set())
      ).toBeNull();
    }
  });

  it("builds nothing after the block has ended", () => {
    expect(
      buildIssueFirstResponse({ ...LIVE_CTX, phase: "ended" }, T, "contrast:1:1", action, new Set())
    ).toBeNull();
  });

  it("builds one in post-task reviewing", () => {
    expect(
      buildIssueFirstResponse(POST_REVIEWING_CTX, T, "contrast:1:1", action, new Set())
    ).not.toBeNull();
  });
});

describe("issue_action", () => {
  it("names the action, the target, the count and the resulting state", () => {
    expect(
      buildIssueAction(LIVE_CTX, T, {
        action: "ignore",
        target: { kind: "root", signature: "sig" },
        instanceCount: 12,
        resultingState: "ignored",
        fromDecisionOffer: true
      })
    ).toEqual({
      type: "issue_action",
      at: T,
      ctx: LIVE_CTX,
      action: "ignore",
      target: { kind: "root", signature: "sig" },
      instanceCount: 12,
      resultingState: "ignored",
      fromDecisionOffer: true
    });
  });

  it("leaves the offer flag out when it does not apply", () => {
    const event = buildIssueAction(LIVE_CTX, T, {
      action: "defer",
      target: { kind: "issue", issueId: "contrast:1:1" },
      instanceCount: 1,
      resultingState: "deferred"
    });

    expect("fromDecisionOffer" in event).toBe(false);
  });

  it("stores a root as a signature and not a list of ids", () => {
    const event = buildIssueAction(LIVE_CTX, T, {
      action: "pin",
      target: { kind: "root", signature: "sig" },
      instanceCount: 100,
      resultingState: "important"
    });

    expect(JSON.stringify(event)).not.toContain("contrast:");
  });
});

describe("reason_written", () => {
  it("keeps the text and where it applied", () => {
    expect(
      buildReasonWritten(
        LIVE_CTX,
        T,
        "Brand colour",
        { kind: "root", signature: "sig" },
        "ignore_sheet"
      )
    ).toEqual({
      type: "reason_written",
      at: T,
      ctx: LIVE_CTX,
      text: "Brand colour",
      truncated: false,
      target: { kind: "root", signature: "sig" },
      source: "ignore_sheet"
    });
  });

  it("keeps exactly the cap and marks anything longer", () => {
    const target = { kind: "issue", issueId: "contrast:1:1" } as const;
    const exact = buildReasonWritten(
      LIVE_CTX,
      T,
      "x".repeat(MAX_REASON_CHARS),
      target,
      "ignore_sheet"
    );
    const over = buildReasonWritten(
      LIVE_CTX,
      T,
      "x".repeat(MAX_REASON_CHARS + 1),
      target,
      "ignore_sheet"
    );

    expect(exact.truncated).toBe(false);
    expect(over.truncated).toBe(true);
    expect(over.text).toHaveLength(MAX_REASON_CHARS);
  });
});

describe("the remaining events", () => {
  it("references the Adjust log entry and does not copy it", () => {
    const event = buildAdjustEvent(LIVE_CTX, T, {
      adjustLogIndex: 4,
      issueId: "contrast:1:1",
      loggedAt: T
    });

    expect(event).toEqual({
      type: "adjust_event",
      at: T,
      ctx: LIVE_CTX,
      adjustLogIndex: 4,
      issueId: "contrast:1:1",
      loggedAt: T
    });
    expect(Object.keys(event)).not.toContain("beforeHex");
  });

  it("builds the three types that nothing emits yet", () => {
    expect(buildMarkerState(LIVE_CTX, T, true)).toMatchObject({
      type: "marker_state",
      markersOn: true
    });
    expect(buildExplanationOpened(LIVE_CTX, T, "why_surfaced", "contrast:1:1")).toMatchObject({
      type: "explanation_opened",
      surface: "why_surfaced",
      issueId: "contrast:1:1"
    });
    expect("issueId" in buildExplanationOpened(LIVE_CTX, T, "teach_me_why")).toBe(false);
    expect(buildRoleAnswered(LIVE_CTX, T, "1:2", "heading")).toMatchObject({
      type: "role_answered",
      nodeId: "1:2",
      role: "heading"
    });
  });

  it("builds events that all pass the schema", () => {
    const events = [
      buildBlockStarted(LIVE_CTX, T, 1),
      buildFeedbackRevealed(POST_REVIEWING_CTX, T),
      ...buildBlockEnded(LIVE_CTX, T, rows(2)),
      buildIssueFirstDetected(LIVE_CTX, T, { id: "contrast:1:1", severity: "low" }, new Set()),
      buildIssueFirstResponse(
        LIVE_CTX,
        T,
        "contrast:1:1",
        { kind: "action", via: "adjust" },
        new Set()
      ),
      buildIssueAction(LIVE_CTX, T, {
        action: "reopen",
        target: { kind: "issue", issueId: "contrast:1:1" },
        instanceCount: 1,
        resultingState: "open"
      }),
      buildReasonWritten(
        LIVE_CTX,
        T,
        "why",
        { kind: "issue", issueId: "contrast:1:1" },
        "decision_offer"
      ),
      buildAdjustEvent(LIVE_CTX, T, { adjustLogIndex: 0, issueId: "contrast:1:1", loggedAt: T }),
      buildMarkerState(LIVE_CTX, T, false),
      buildExplanationOpened(LIVE_CTX, T, "why_surfaced"),
      buildRoleAnswered(LIVE_CTX, T, "1:2", "button")
    ];

    for (const event of events) expect(isStudyEvent(event)).toBe(true);
  });
});
