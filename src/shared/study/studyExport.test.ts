import { describe, expect, it } from "vitest";

import { buildBlockEnded } from "./studyEventBuilders";
import { LIVE_CTX, T, sessionFor } from "./studyEventFixtures";
import type { SnapshotRow, StudyEvent } from "./studyEvents";
import {
  STUDY_EXPORT_SCHEMA_VERSION,
  buildStudyExport,
  exportFileName,
  finalSnapshotFromEvents,
  hasCurrentExport
} from "./studyExport";

const rows = (count: number): SnapshotRow[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `contrast:1:${i}`,
    state: "open",
    severity: "low"
  }));

describe("exportFileName", () => {
  it("carries the participant, block and task", () => {
    expect(
      exportFileName(sessionFor({ ...LIVE_CTX, participantId: "P-07", block: 2, task: "B" }))
    ).toBe("cadt-study-P-07-block2-taskB.json");
  });
});

describe("finalSnapshotFromEvents", () => {
  it("is null while the block has not ended", () => {
    expect(finalSnapshotFromEvents([])).toBeNull();
  });

  it("puts split parts back together in order, whatever order they were stored in", () => {
    const parts = buildBlockEnded(LIVE_CTX, T, rows(10), 4);
    const shuffled: StudyEvent[] = [
      parts[2] as StudyEvent,
      parts[0] as StudyEvent,
      parts[1] as StudyEvent
    ];

    expect(finalSnapshotFromEvents(shuffled)).toEqual(rows(10));
  });

  it("ignores every other event", () => {
    const other: StudyEvent = { type: "feedback_revealed", at: T, ctx: LIVE_CTX };

    expect(finalSnapshotFromEvents([other, ...buildBlockEnded(LIVE_CTX, T, rows(2))])).toEqual(
      rows(2)
    );
  });
});

describe("buildStudyExport", () => {
  it("holds the schema version, session, events, adjust log and snapshot", () => {
    const session = sessionFor(LIVE_CTX);
    const events = buildBlockEnded(LIVE_CTX, T, rows(3));
    const file = buildStudyExport({
      exportedAt: T,
      session,
      events,
      adjustLog: [{ issueId: "contrast:1:1" }],
      droppedWrites: { noConsent: 0 }
    });

    expect(file).toEqual({
      schemaVersion: STUDY_EXPORT_SCHEMA_VERSION,
      exportedAt: T,
      session,
      events,
      adjustLog: [{ issueId: "contrast:1:1" }],
      finalSnapshot: rows(3),
      droppedWrites: { noConsent: 0 }
    });
  });

  it("has no final snapshot when taken mid block, and survives JSON", () => {
    const file = buildStudyExport({
      exportedAt: T,
      session: sessionFor(LIVE_CTX),
      events: [],
      adjustLog: [],
      droppedWrites: {}
    });

    expect(file.finalSnapshot).toBeNull();
    expect(JSON.parse(JSON.stringify(file))).toEqual(file);
  });
});

describe("hasCurrentExport", () => {
  const ended = {
    ...sessionFor(LIVE_CTX),
    phase: "ended" as const,
    endedAt: "2026-10-11T09:40:00.000Z"
  };

  it.each([
    [[], false],
    [["2026-10-11T09:30:00.000Z"], false],
    [["2026-10-11T09:40:00.000Z"], true],
    [["2026-10-11T09:30:00.000Z", "2026-10-11T09:50:00.000Z"], true]
  ])("exports %j gives %s", (exports, expected) => {
    expect(hasCurrentExport({ ...ended, exports })).toBe(expected);
  });

  it("is false for a block that has not ended, however many exports there are", () => {
    expect(hasCurrentExport({ ...sessionFor(LIVE_CTX), exports: [T, T] })).toBe(false);
  });
});
