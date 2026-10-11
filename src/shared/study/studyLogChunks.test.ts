import { describe, expect, it } from "vitest";

import { buildReasonWritten } from "./studyEventBuilders";
import { LIVE_CTX, T } from "./studyEventFixtures";
import type { StudyEvent } from "./studyEvents";
import { MAX_CHUNK_BYTES, planAppend } from "./studyLogChunks";

const bytes = (events: StudyEvent[]) => new TextEncoder().encode(JSON.stringify(events)).length;
const reason = (text: string): StudyEvent =>
  buildReasonWritten(LIVE_CTX, T, text, { kind: "issue", issueId: "contrast:1:1" }, "ignore_sheet");

describe("planAppend", () => {
  it("starts the first chunk with the event", () => {
    expect(planAppend([], reason("a"))).toEqual({
      ok: true,
      target: "last",
      events: [reason("a")]
    });
  });

  it("adds to the last chunk while it fits", () => {
    const plan = planAppend([reason("a")], reason("b"));

    expect(plan).toEqual({ ok: true, target: "last", events: [reason("a"), reason("b")] });
  });

  it("moves to a new chunk exactly when the next event would pass the limit", () => {
    const one = reason("x".repeat(100));
    const limit = bytes([one, one]);

    expect(planAppend([one], one, limit)).toMatchObject({ ok: true, target: "last" });
    expect(planAppend([one], one, limit - 1)).toMatchObject({
      ok: true,
      target: "new",
      events: [one]
    });
  });

  it("refuses an event that cannot fit an empty chunk", () => {
    expect(planAppend([], reason("x".repeat(500)), 200)).toEqual({
      ok: false,
      reason: "too_large"
    });
    expect(planAppend([reason("a")], reason("x".repeat(500)), 200)).toEqual({
      ok: false,
      reason: "too_large"
    });
  });

  it("keeps the default limit under the 100 kB entry limit with room to spare", () => {
    expect(MAX_CHUNK_BYTES).toBeLessThan(100000);
    expect(MAX_CHUNK_BYTES).toBeGreaterThanOrEqual(50000);
  });
});
