import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildBlockStarted,
  buildIssueAction,
  buildReasonWritten
} from "../../../shared/study/studyEventBuilders";
import { LIVE_CTX, T, sessionFor } from "../../../shared/study/studyEventFixtures";
import type { StudyEvent } from "../../../shared/study/studyEvents";
import { MAX_CHUNK_BYTES } from "../../../shared/study/studyLogChunks";
import {
  STORAGE_KEY_PROFILE,
  STORAGE_KEY_STUDY_LOG,
  STORAGE_KEY_STUDY_SESSION
} from "../../storage/storageKeys";
import {
  appendStudyEvent,
  clearStudyLog,
  getDropCounts,
  loadPersistedDropCounts,
  loadStudyEvents,
  resetMemoryDropCounts,
  type StudyLogDeps
} from "./studyLogStore";

const SESSION = sessionFor(LIVE_CTX);
const ACTIVE: StudyLogDeps = { getSession: () => SESSION, hasConsent: async () => true };
const NO_SESSION: StudyLogDeps = { getSession: () => null, hasConsent: async () => true };
const NO_CONSENT: StudyLogDeps = { getSession: () => SESSION, hasConsent: async () => false };

const chunkKey = (index: number) => `${STORAGE_KEY_STUDY_LOG}.c${index}`;
const META_KEY = `${STORAGE_KEY_STUDY_LOG}.meta`;

let data: Map<string, string>;
let setPluginData: ReturnType<typeof vi.fn>;

const action = (n: number): StudyEvent =>
  buildIssueAction(LIVE_CTX, T, {
    action: "defer",
    target: { kind: "issue", issueId: `contrast:1:${n}` },
    instanceCount: 1,
    resultingState: "deferred"
  });

/** About 4.4 kB each, so a 60 kB chunk holds about thirteen */
const bigReason = (n: number): StudyEvent =>
  buildReasonWritten(
    LIVE_CTX,
    T,
    `${n}:`.padEnd(4000, "x"),
    { kind: "issue", issueId: `contrast:1:${n}` },
    "ignore_sheet"
  );

const chunkBytes = (index: number) =>
  new TextEncoder().encode(data.get(chunkKey(index)) ?? "").length;
const chunksWritten = () =>
  [...data.entries()].filter(([key, value]) => /\.c\d+$/.test(key) && value !== "").length;

beforeEach(() => {
  data = new Map();
  setPluginData = vi.fn((key: string, value: string) => void data.set(key, value));
  vi.stubGlobal("figma", {
    root: { getPluginData: (key: string) => data.get(key) ?? "", setPluginData }
  });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  resetMemoryDropCounts();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("append and load", () => {
  it("returns an empty log for a file with none", () => {
    expect(loadStudyEvents()).toEqual([]);
  });

  it("round trips events in the order they were written", async () => {
    const events = [buildBlockStarted(LIVE_CTX, T, 1), action(1), action(2)];
    for (const event of events) {
      expect(await appendStudyEvent(event, ACTIVE)).toEqual({ written: true });
    }

    expect(loadStudyEvents()).toEqual(events);
    expect(STORAGE_KEY_STUDY_LOG).toBe("cadt.study.log.v1");
    expect(data.has(chunkKey(0))).toBe(true);
    expect(chunksWritten()).toBe(1);
  });

  it("rewrites only the last chunk on an append", async () => {
    for (let i = 0; i < 40; i++) await appendStudyEvent(bigReason(i), ACTIVE);
    setPluginData.mockClear();
    await appendStudyEvent(action(99), ACTIVE);

    expect(setPluginData).toHaveBeenCalledTimes(1);
  });
});

describe("chunk boundaries", () => {
  it("keeps every chunk under the limit and loses and repeats nothing", async () => {
    const events = Array.from({ length: 60 }, (_, n) => bigReason(n));
    for (const event of events) await appendStudyEvent(event, ACTIVE);

    expect(chunksWritten()).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < chunksWritten(); i++) {
      expect(chunkBytes(i)).toBeLessThanOrEqual(MAX_CHUNK_BYTES);
    }
    expect(loadStudyEvents()).toEqual(events);
  });

  it("starts a new chunk, and does not touch the full one, when the next event would not fit", async () => {
    let n = 0;
    while (chunksWritten() < 1 || chunkBytes(0) + 4500 <= MAX_CHUNK_BYTES) {
      await appendStudyEvent(bigReason(n++), ACTIVE);
    }
    const before = data.get(chunkKey(0));
    await appendStudyEvent(bigReason(n++), ACTIVE);

    expect(chunksWritten()).toBe(2);
    expect(data.get(chunkKey(0))).toBe(before);
    expect(loadStudyEvents()).toHaveLength(n);
  });

  it("does not rewrite a chunk it found damaged, the event goes into a new one", async () => {
    data.set(chunkKey(0), "{not json");
    await appendStudyEvent(action(1), ACTIVE);

    expect(data.get(chunkKey(0))).toBe("{not json");
    expect(chunksWritten()).toBe(2);
    expect(loadStudyEvents()).toEqual([action(1)]);
  });

  it("refuses an event larger than a chunk and counts it", async () => {
    const huge = buildReasonWritten(
      LIVE_CTX,
      T,
      "x".repeat(10),
      { kind: "issue", issueId: "a" },
      "ignore_sheet"
    );
    const oversized = { ...huge, text: "x".repeat(MAX_CHUNK_BYTES) } as StudyEvent;

    expect(await appendStudyEvent(oversized, ACTIVE)).toEqual({
      written: false,
      reason: "tooLarge"
    });
    expect(chunksWritten()).toBe(0);
    expect(loadPersistedDropCounts().tooLarge).toBe(1);
  });
});

describe("load schema check", () => {
  it("skips invalid events and a chunk that is not a list, and logs why", () => {
    data.set(chunkKey(0), JSON.stringify([action(1), { type: "nope" }, action(2)]));
    data.set(chunkKey(1), JSON.stringify({ not: "a list" }));
    data.set(chunkKey(2), JSON.stringify([action(3)]));

    expect(loadStudyEvents()).toEqual([action(1), action(2), action(3)]);
    expect(console.error).toHaveBeenCalledTimes(2);
  });

  it("does not erase what it skips", () => {
    data.set(chunkKey(0), "{broken");
    loadStudyEvents();

    expect(setPluginData).not.toHaveBeenCalled();
    expect(data.get(chunkKey(0))).toBe("{broken");
  });
});

describe("nothing is written without a session", () => {
  it("drops the event, writes nothing at all, and counts it in memory only", async () => {
    const result = await appendStudyEvent(action(1), NO_SESSION);

    expect(result).toEqual({ written: false, reason: "noSession" });
    expect(setPluginData).not.toHaveBeenCalled();
    expect(data.size).toBe(0);
    expect(getDropCounts().noSession).toBe(1);
  });

  it("counts each drop", async () => {
    await appendStudyEvent(action(1), NO_SESSION);
    await appendStudyEvent(action(2), NO_SESSION);

    expect(getDropCounts().noSession).toBe(2);
  });

  it("uses the real session lookup by default and drops when there is none", async () => {
    const result = await appendStudyEvent(action(1));

    expect(result).toEqual({ written: false, reason: "noSession" });
    expect(setPluginData).not.toHaveBeenCalled();
  });

  it("drops once the researcher has exited, since study mode is no longer active", async () => {
    data.set(STORAGE_KEY_STUDY_SESSION, JSON.stringify({ ...SESSION, exitedAt: T }));
    const result = await appendStudyEvent(action(1));

    expect(result).toEqual({ written: false, reason: "noSession" });
    expect(chunksWritten()).toBe(0);
  });
});

describe("nothing is written without consent", () => {
  it("drops the event and counts it with the log", async () => {
    const result = await appendStudyEvent(action(1), NO_CONSENT);

    expect(result).toEqual({ written: false, reason: "noConsent" });
    expect(chunksWritten()).toBe(0);
    expect(getDropCounts().noConsent).toBe(1);
    expect(loadPersistedDropCounts().noConsent).toBe(1);
  });

  it("accumulates the persisted count across drops", async () => {
    await appendStudyEvent(action(1), NO_CONSENT);
    await appendStudyEvent(action(2), NO_CONSENT);

    expect(JSON.parse(data.get(META_KEY) ?? "{}").noConsent).toBe(2);
  });

  it("writes through the default path in a real session, where consent comes from the study profile", async () => {
    data.set(STORAGE_KEY_STUDY_SESSION, JSON.stringify(SESSION));
    data.set(
      STORAGE_KEY_PROFILE,
      JSON.stringify({ schemaVersion: 1, completedAt: T, loggingConsent: false, answers: {} })
    );
    vi.stubGlobal("figma", {
      root: { getPluginData: (key: string) => data.get(key) ?? "", setPluginData },
      clientStorage: { getAsync: async () => undefined }
    });

    expect(await appendStudyEvent(action(1))).toEqual({ written: true });
  });
});

describe("events that do not belong to the session", () => {
  it.each([
    ["participant", { ...LIVE_CTX, participantId: "P99" }],
    ["block", { ...LIVE_CTX, block: 2 as const }],
    ["task", { ...LIVE_CTX, task: "B" as const }],
    ["condition", { ...LIVE_CTX, condition: "post-task" as const }]
  ])("drops an event with a different %s", async (_name, ctx) => {
    const event = buildIssueAction(ctx, T, {
      action: "defer",
      target: { kind: "issue", issueId: "a" },
      instanceCount: 1,
      resultingState: "deferred"
    });

    expect(await appendStudyEvent(event, ACTIVE)).toEqual({
      written: false,
      reason: "contextMismatch"
    });
    expect(chunksWritten()).toBe(0);
  });

  it("accepts an event whose phase has moved on, the phase is not part of the match", async () => {
    const event = buildBlockStarted({ ...LIVE_CTX, phase: "ended" }, T, 1);

    expect(await appendStudyEvent(event, ACTIVE)).toEqual({ written: true });
  });
});

describe("write failures and clearing", () => {
  it("counts a failed write and raises nothing", async () => {
    setPluginData.mockImplementation(() => {
      throw new Error("entry too large");
    });

    expect(await appendStudyEvent(action(1), ACTIVE)).toEqual({
      written: false,
      reason: "writeFailed"
    });
    expect(getDropCounts().writeFailed).toBe(1);
  });

  it("clears every chunk and the counts", async () => {
    for (let i = 0; i < 40; i++) await appendStudyEvent(bigReason(i), ACTIVE);
    await appendStudyEvent(action(1), NO_CONSENT);
    clearStudyLog();

    expect(loadStudyEvents()).toEqual([]);
    expect(chunksWritten()).toBe(0);
    expect(loadPersistedDropCounts().noConsent).toBe(0);
  });
});
