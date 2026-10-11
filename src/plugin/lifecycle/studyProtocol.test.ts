import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isStudyStateMessage } from "../../shared/study/studyMessageGuards";
import type { StudyMessage, StudyStateMessage } from "../../shared/study/studyMessageTypes";
import {
  STORAGE_KEY_ADJUST_LOG,
  STORAGE_KEY_DECISIONS,
  STORAGE_KEY_ISSUES,
  STORAGE_KEY_STUDY_SESSION
} from "../storage/storageKeys";
import { handleStudyMessage, sendStudyState } from "./studyProtocol";

const NOW = "2026-10-06T09:00:00.000Z";
const LATER = "2026-10-06T09:20:00.000Z";

const START: StudyMessage = {
  type: "STUDY_START_BLOCK",
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "post-task",
  paperConsentSigned: true
};

const OPEN_ISSUE = {
  state: "open",
  severityAtLastDetection: "high",
  encounterCount: 0,
  lastDetectedAt: "2026-10-06T08:00:00.000Z"
};

let data: Map<string, string>;
let setPluginData: ReturnType<typeof vi.fn>;
let replies: StudyStateMessage[];

const reply = (message: unknown) => replies.push(message as StudyStateMessage);
const clock = (time: string) => () => time;
const storedSession = () => JSON.parse(data.get(STORAGE_KEY_STUDY_SESSION) ?? "null");

beforeEach(() => {
  data = new Map();
  replies = [];
  setPluginData = vi.fn((key: string, value: string) => void data.set(key, value));
  vi.stubGlobal("figma", {
    root: { getPluginData: (key: string) => data.get(key) ?? "", setPluginData }
  });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function expectNothingSaved() {
  expect(setPluginData).not.toHaveBeenCalled();
}

describe("sendStudyState", () => {
  it("sends no session and unrestricted visibility on a file with none", () => {
    sendStudyState(reply);

    expect(replies).toHaveLength(1);
    expect(isStudyStateMessage(replies[0])).toBe(true);
    expect(replies[0]).toMatchObject({ type: "STUDY_STATE", session: null, refusal: null });
    expect(replies[0]?.visibility.issueList).toBe(true);
    expect(replies[0]?.visibility.calibrationAndConsent).toBe(true);
  });

  it("sends the stored session with the visibility it implies", () => {
    handleStudyMessage(START, reply, clock(NOW));
    replies = [];
    sendStudyState(reply);

    expect(replies[0]?.session?.phase).toBe("designing");
    expect(replies[0]?.visibility.issueList).toBe(false);
    expect(replies[0]?.visibility.message).toBe("Feedback will appear when you finish designing.");
  });

  it("is not wrapped in a pluginMessage envelope", () => {
    sendStudyState(reply);

    expect(replies[0]).toHaveProperty("type", "STUDY_STATE");
    expect(replies[0]).not.toHaveProperty("pluginMessage");
  });
});

describe("STUDY_START_BLOCK", () => {
  it("saves a designing session on an empty file and replies with it", () => {
    handleStudyMessage(START, reply, clock(NOW));

    expect(storedSession()).toMatchObject({
      participantId: "P01",
      condition: "post-task",
      phase: "designing",
      startedAt: NOW
    });
    expect(replies).toHaveLength(1);
    expect(replies[0]).toMatchObject({ session: { phase: "designing" }, refusal: null });
  });

  it("starts on a file holding only detector created issue records", () => {
    data.set(
      STORAGE_KEY_ISSUES,
      JSON.stringify({ "contrast:1:1": OPEN_ISSUE, "contrast:1:2": OPEN_ISSUE })
    );
    handleStudyMessage(START, reply, clock(NOW));

    expect(replies[0]?.refusal).toBeNull();
    expect(storedSession()).not.toBeNull();
  });

  it.each([
    [
      "a deferred issue",
      STORAGE_KEY_ISSUES,
      { "contrast:1:1": { ...OPEN_ISSUE, state: "deferred" } },
      "responses to issues"
    ],
    [
      "an issue met again",
      STORAGE_KEY_ISSUES,
      { "contrast:1:1": { ...OPEN_ISSUE, encounterCount: 2 } },
      "responses to issues"
    ],
    [
      "a decision",
      STORAGE_KEY_DECISIONS,
      { sig: { reason: "brand", recordedAt: NOW, severityAtDecision: "low" } },
      "recorded decisions"
    ],
    [
      "an Adjust log entry",
      STORAGE_KEY_ADJUST_LOG,
      [{ issueId: "contrast:1:1" }],
      "Adjust log entries"
    ]
  ])("refuses a file with %s, saving nothing", (_name, key, value, words) => {
    data.set(key, JSON.stringify(value));
    handleStudyMessage(START, reply, clock(NOW));

    expect(replies[0]?.refusal?.code).toBe("not-fresh");
    expect(replies[0]?.refusal?.reason).toContain(words);
    expect(replies[0]?.refusal?.reason).toContain("Use a fresh copy of the task file.");
    expect(replies[0]?.session).toBeNull();
    expectNothingSaved();
  });

  it("refuses when a session already exists, keeping it as it was", () => {
    handleStudyMessage(START, reply, clock(NOW));
    const before = data.get(STORAGE_KEY_STUDY_SESSION);
    setPluginData.mockClear();
    replies = [];
    handleStudyMessage({ ...START, participantId: "P02" }, reply, clock(LATER));

    expect(replies[0]?.refusal?.code).toBe("session-exists");
    expect(replies[0]?.session?.participantId).toBe("P01");
    expectNothingSaved();
    expect(data.get(STORAGE_KEY_STUDY_SESSION)).toBe(before);
  });

  it("refuses when an unreadable session is already stored", () => {
    data.set(STORAGE_KEY_STUDY_SESSION, "{broken");
    handleStudyMessage(START, reply, clock(NOW));

    expect(replies[0]?.refusal?.code).toBe("not-fresh");
    expect(replies[0]?.refusal?.reason).toContain("study session");
    expectNothingSaved();
  });

  it("refuses an invalid form with the first problem and saves nothing", () => {
    handleStudyMessage({ ...START, paperConsentSigned: false }, reply, clock(NOW));

    expect(replies[0]?.refusal).toEqual({
      code: "invalid-form",
      reason: "Confirm that paper consent was signed"
    });
    expectNothingSaved();
  });

  it("refuses a participant id that is not safe in a file name", () => {
    handleStudyMessage({ ...START, participantId: "a/b" }, reply, clock(NOW));

    expect(replies[0]?.refusal?.code).toBe("invalid-form");
    expectNothingSaved();
  });

  it("refuses and reports when the save fails", () => {
    setPluginData.mockImplementation(() => {
      throw new Error("entry too large");
    });
    handleStudyMessage(START, reply, clock(NOW));

    expect(replies[0]?.refusal).toEqual({ code: "save-failed", reason: "entry too large" });
    expect(replies[0]?.session).toBeNull();
  });
});

describe("STUDY_SUBSCRIBE", () => {
  it("answers with the current state and saves nothing", () => {
    handleStudyMessage({ type: "STUDY_SUBSCRIBE" }, reply, clock(NOW));

    expect(replies).toHaveLength(1);
    expect(replies[0]).toMatchObject({ type: "STUDY_STATE", session: null, refusal: null });
    expectNothingSaved();
  });

  it("answers with the stored session", () => {
    handleStudyMessage(START, reply, clock(NOW));
    replies = [];
    handleStudyMessage({ type: "STUDY_SUBSCRIBE" }, reply, clock(LATER));

    expect(replies[0]?.session?.phase).toBe("designing");
  });
});

describe("STUDY_REVEAL, STUDY_END_BLOCK and STUDY_EXIT", () => {
  function started(condition: "live" | "post-task") {
    handleStudyMessage({ ...START, condition } as StudyMessage, reply, clock(NOW));
    replies = [];
    setPluginData.mockClear();
  }

  it("reveals a post-task block, saves it and shows the feedback surfaces", () => {
    started("post-task");
    handleStudyMessage({ type: "STUDY_REVEAL" }, reply, clock(LATER));

    expect(storedSession()).toMatchObject({ phase: "reviewing", revealedAt: LATER });
    expect(replies[0]?.visibility.issueList).toBe(true);
  });

  it("refuses to reveal a live block and changes nothing", () => {
    started("live");
    handleStudyMessage({ type: "STUDY_REVEAL" }, reply, clock(LATER));

    expect(replies[0]?.refusal?.code).toBe("not-post-task");
    expect(replies[0]?.session?.phase).toBe("designing");
    expectNothingSaved();
  });

  it("ends a live block and shows the ended message", () => {
    started("live");
    handleStudyMessage({ type: "STUDY_END_BLOCK" }, reply, clock(LATER));

    expect(storedSession()).toMatchObject({ phase: "ended", endedAt: LATER });
    expect(replies[0]?.visibility.message).toBe("This task has ended.");
  });

  it("refuses to end a post-task block before the review", () => {
    started("post-task");
    handleStudyMessage({ type: "STUDY_END_BLOCK" }, reply, clock(LATER));

    expect(replies[0]?.refusal?.code).toBe("review-required");
    expectNothingSaved();
  });

  it("exits at any phase, keeping the phase and the record", () => {
    started("post-task");
    handleStudyMessage({ type: "STUDY_EXIT" }, reply, clock(LATER));

    expect(storedSession()).toMatchObject({ phase: "designing", exitedAt: LATER, startedAt: NOW });
    expect(replies[0]?.visibility).toMatchObject({ issueList: true, calibrationAndConsent: true });
  });

  it.each(["STUDY_REVEAL", "STUDY_END_BLOCK", "STUDY_EXIT"] as const)(
    "refuses %s when there is no session, saving nothing",
    (type) => {
      handleStudyMessage({ type }, reply, clock(LATER));

      expect(replies[0]?.refusal?.code).toBe("no-session");
      expect(replies[0]?.session).toBeNull();
      expectNothingSaved();
    }
  );

  it("refuses a second exit", () => {
    started("live");
    handleStudyMessage({ type: "STUDY_EXIT" }, reply, clock(LATER));
    setPluginData.mockClear();
    handleStudyMessage({ type: "STUDY_EXIT" }, reply, clock(LATER));

    expect(replies.at(-1)?.refusal?.code).toBe("exited");
    expectNothingSaved();
  });

  it("refuses and reports when the save fails, leaving the phase unchanged", () => {
    started("post-task");
    setPluginData.mockImplementation(() => {
      throw new Error("disk full");
    });
    handleStudyMessage({ type: "STUDY_REVEAL" }, reply, clock(LATER));

    expect(replies[0]?.refusal).toEqual({ code: "save-failed", reason: "disk full" });
    expect(replies[0]?.session?.phase).toBe("designing");
    expect(storedSession().phase).toBe("designing");
  });
});
