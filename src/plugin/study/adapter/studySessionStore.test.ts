import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudySession } from "../../../shared/study/studyTypes";
import { STORAGE_KEY_STUDY_SESSION } from "../../storage/storageKeys";
import { clearStudySession, loadStudySession, saveStudySession } from "./studySessionStore";

const SESSION: StudySession = {
  schemaVersion: 1,
  participantId: "P01",
  block: 2,
  task: "B",
  condition: "post-task",
  consentConfirmedAt: "2026-10-06T09:00:00.000Z",
  phase: "reviewing",
  startedAt: "2026-10-06T09:00:00.000Z",
  revealedAt: "2026-10-06T09:20:00.000Z",
  endedAt: null,
  exports: [],
  exitedAt: null
};

let data: Map<string, string>;
let setPluginData: ReturnType<typeof vi.fn>;

beforeEach(() => {
  data = new Map();
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

describe("studySessionStore", () => {
  it("returns null when nothing is stored", () => {
    expect(loadStudySession()).toBeNull();
  });

  it("round trips a session under the versioned key", () => {
    expect(saveStudySession(SESSION)).toEqual({ saved: true });

    expect(setPluginData).toHaveBeenCalledWith(STORAGE_KEY_STUDY_SESSION, JSON.stringify(SESSION));
    expect(STORAGE_KEY_STUDY_SESSION).toBe("cadt.study.session.v1");
    expect(loadStudySession()).toEqual(SESSION);
  });

  it("discards data that is not valid JSON and logs why", () => {
    data.set(STORAGE_KEY_STUDY_SESSION, "{not json");

    expect(loadStudySession()).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "loadStudySession: stored session was not valid JSON",
      expect.anything()
    );
  });

  it("discards a session that fails the schema check and logs the reason", () => {
    data.set(STORAGE_KEY_STUDY_SESSION, JSON.stringify({ ...SESSION, task: "C" }));

    expect(loadStudySession()).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "loadStudySession: discarded the stored session, the task is not A or B"
    );
  });

  it("does not erase what it discarded", () => {
    data.set(STORAGE_KEY_STUDY_SESSION, JSON.stringify({ nope: true }));
    loadStudySession();

    expect(setPluginData).not.toHaveBeenCalled();
    expect(data.get(STORAGE_KEY_STUDY_SESSION)).toBe(JSON.stringify({ nope: true }));
  });

  it("reports a failed save with its reason", () => {
    setPluginData.mockImplementation(() => {
      throw new Error("entry too large");
    });

    expect(saveStudySession(SESSION)).toEqual({ saved: false, error: "entry too large" });
  });

  it("clears the session by writing an empty value", () => {
    saveStudySession(SESSION);
    clearStudySession();

    expect(loadStudySession()).toBeNull();
    expect(data.get(STORAGE_KEY_STUDY_SESSION)).toBe("");
  });
});
