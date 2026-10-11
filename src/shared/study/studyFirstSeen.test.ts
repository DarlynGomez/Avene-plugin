import { describe, expect, it } from "vitest";

import { firstSeenFromEvents } from "./studyFirstSeen";
import type { StudyEvent } from "./studyEvents";
import { LIVE_CTX, T } from "./studyEventFixtures";
import {
  buildIssueAction,
  buildIssueFirstDetected,
  buildIssueFirstResponse
} from "./studyEventBuilders";

/** Builders return null for a repeat, a fixture that is not null is a mistake in the test */
function built<T extends StudyEvent>(event: T | null): T {
  if (event === null) throw new Error("the fixture event was not built");
  return event;
}

describe("firstSeenFromEvents", () => {
  it("is empty for an empty log", () => {
    const seen = firstSeenFromEvents([]);

    expect(seen.detected.size).toBe(0);
    expect(seen.responded.size).toBe(0);
  });

  it("collects detections and responses, and ignores every other event", () => {
    const seen = firstSeenFromEvents([
      built(buildIssueFirstDetected(LIVE_CTX, T, { id: "a", severity: "low" }, new Set())),
      built(buildIssueFirstDetected(LIVE_CTX, T, { id: "b", severity: "low" }, new Set())),
      built(buildIssueFirstResponse(LIVE_CTX, T, "a", { kind: "action", via: "pin" }, new Set())),
      buildIssueAction(LIVE_CTX, T, {
        action: "pin",
        target: { kind: "issue", issueId: "c" },
        instanceCount: 1,
        resultingState: "important"
      })
    ]);

    expect([...seen.detected].sort()).toEqual(["a", "b"]);
    expect([...seen.responded]).toEqual(["a"]);
  });

  it("lets the builders produce each first event only once", () => {
    const log = [
      built(buildIssueFirstDetected(LIVE_CTX, T, { id: "a", severity: "low" }, new Set()))
    ];
    const { detected } = firstSeenFromEvents(log);

    expect(buildIssueFirstDetected(LIVE_CTX, T, { id: "a", severity: "low" }, detected)).toBeNull();
  });
});
