import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CalibrationProfile } from "../../shared/calibrationSchema";
import { endBlock, exitStudy, startBlock } from "../../shared/study/sessionTransitions";
import { STUDY_ANSWERS } from "../../shared/study/studyProfile";
import type { StudySession } from "../../shared/study/studyTypes";
import { logAdjustEvent, loadAdjustLog } from "../adjust/adapter/adjustLogging";
import { handleCalibrationMessage } from "../lifecycle/calibrationProtocol";
import { resolveCalibration, saveCalibration } from "./calibrationStore";
import {
  STORAGE_KEY_ADJUST_LOG,
  STORAGE_KEY_PROFILE,
  STORAGE_KEY_STUDY_SESSION
} from "./storageKeys";

const FILE_PROFILE: CalibrationProfile = {
  schemaVersion: 1,
  completedAt: "2026-09-01T00:00:00.000Z",
  loggingConsent: false,
  answers: { projectType: "game", aiAssistanceLevel: 1, useEnvironments: ["low-light"] }
};
const USER_PROFILE: CalibrationProfile = {
  ...FILE_PROFILE,
  answers: { projectType: "web-page", aiAssistanceLevel: 4 }
};

const clock = (time: string) => () => time;
const FORM = {
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  paperConsentSigned: true
};

let fileData: Map<string, string>;
let userData: Map<string, unknown>;
let setPluginData: ReturnType<typeof vi.fn>;
let setAsync: ReturnType<typeof vi.fn>;

function putSession(session: StudySession) {
  fileData.set(STORAGE_KEY_STUDY_SESSION, JSON.stringify(session));
}

function startedSession(): StudySession {
  const result = startBlock(FORM, null, clock("2026-10-06T09:00:00.000Z"));
  if (!result.ok) throw new Error("fixture did not start");
  return result.session;
}

beforeEach(() => {
  fileData = new Map();
  userData = new Map();
  setPluginData = vi.fn((key: string, value: string) => void fileData.set(key, value));
  setAsync = vi.fn(async (key: string, value: unknown) => void userData.set(key, value));
  vi.stubGlobal("figma", {
    root: { getPluginData: (key: string) => fileData.get(key) ?? "", setPluginData },
    clientStorage: { getAsync: async (key: string) => userData.get(key), setAsync }
  });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resolveCalibration with a study session", () => {
  it("returns the study profile over a stored profile with different answers", async () => {
    fileData.set(STORAGE_KEY_PROFILE, JSON.stringify(FILE_PROFILE));
    userData.set(STORAGE_KEY_PROFILE, USER_PROFILE);
    putSession(startedSession());

    const resolution = await resolveCalibration();

    expect(resolution?.scope).toBe("study");
    expect(resolution?.profile.answers).toEqual(STUDY_ANSWERS);
    expect(resolution?.profile.answers.projectType).not.toBe("game");
    expect(resolution?.profile.loggingConsent).toBe(true);
  });

  it("returns the study profile when nothing is stored in either scope", async () => {
    putSession(startedSession());

    const resolution = await resolveCalibration();

    expect(resolution?.profile.answers).toEqual(STUDY_ANSWERS);
  });

  it("keeps the study profile after the block ends, until the researcher exits", async () => {
    fileData.set(STORAGE_KEY_PROFILE, JSON.stringify(FILE_PROFILE));
    const ended = endBlock(startedSession(), clock("2026-10-06T09:20:00.000Z"));
    if (!ended.ok) throw new Error("fixture did not end");
    putSession(ended.session);

    expect((await resolveCalibration())?.scope).toBe("study");
  });

  it("restores the stored profile untouched after the block ends and study mode is exited", async () => {
    fileData.set(STORAGE_KEY_PROFILE, JSON.stringify(FILE_PROFILE));
    userData.set(STORAGE_KEY_PROFILE, USER_PROFILE);
    const ended = endBlock(startedSession(), clock("2026-10-06T09:20:00.000Z"));
    if (!ended.ok) throw new Error("fixture did not end");
    const exited = exitStudy(ended.session, clock("2026-10-06T09:30:00.000Z"));
    if (!exited.ok) throw new Error("fixture did not exit");
    putSession(exited.session);
    setPluginData.mockClear();

    const resolution = await resolveCalibration();

    expect(resolution).toEqual({ scope: "file", profile: FILE_PROFILE });
    expect(fileData.get(STORAGE_KEY_PROFILE)).toBe(JSON.stringify(FILE_PROFILE));
    expect(userData.get(STORAGE_KEY_PROFILE)).toEqual(USER_PROFILE);
    expect(setPluginData).not.toHaveBeenCalled();
    expect(setAsync).not.toHaveBeenCalled();
  });

  it("falls back to the user profile after exit when the file has none", async () => {
    userData.set(STORAGE_KEY_PROFILE, USER_PROFILE);
    const exited = exitStudy(startedSession(), clock("2026-10-06T09:30:00.000Z"));
    if (!exited.ok) throw new Error("fixture did not exit");
    putSession(exited.session);

    expect(await resolveCalibration()).toEqual({ scope: "user", profile: USER_PROFILE });
  });

  it("is unchanged when there is no session", async () => {
    fileData.set(STORAGE_KEY_PROFILE, JSON.stringify(FILE_PROFILE));

    expect(await resolveCalibration()).toEqual({ scope: "file", profile: FILE_PROFILE });
  });

  it("ignores an unreadable session and uses the stored profile", async () => {
    fileData.set(STORAGE_KEY_STUDY_SESSION, "{broken");
    fileData.set(STORAGE_KEY_PROFILE, JSON.stringify(FILE_PROFILE));

    expect((await resolveCalibration())?.scope).toBe("file");
  });
});

describe("calibration saves during a study session", () => {
  it("refuses to write either stored scope", async () => {
    putSession(startedSession());
    setPluginData.mockClear();

    const result = await saveCalibration(FILE_PROFILE);

    expect(result.fileSaved).toBe(false);
    expect(result.userSaved).toBe(false);
    expect(setPluginData).not.toHaveBeenCalled();
    expect(setAsync).not.toHaveBeenCalled();
  });

  it("answers a CALIBRATION_SAVE with a failure and writes nothing", async () => {
    putSession(startedSession());
    setPluginData.mockClear();
    const reply = vi.fn();

    await handleCalibrationMessage({ type: "CALIBRATION_SAVE", profile: FILE_PROFILE }, reply);

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ type: "CALIBRATION_SAVE_FAILED" })
    );
    expect(setPluginData).not.toHaveBeenCalled();
    expect(setAsync).not.toHaveBeenCalled();
  });

  it("still saves normally once study mode is exited", async () => {
    const exited = exitStudy(startedSession(), clock("2026-10-06T09:30:00.000Z"));
    if (!exited.ok) throw new Error("fixture did not exit");
    putSession(exited.session);

    const result = await saveCalibration(FILE_PROFILE);

    expect(result).toEqual({ fileSaved: true, userSaved: true });
  });

  it("loads the study profile over CALIBRATION_LOAD with the study scope", async () => {
    putSession(startedSession());
    const reply = vi.fn();

    await handleCalibrationMessage({ type: "CALIBRATION_LOAD" }, reply);

    expect(reply).toHaveBeenCalledWith({
      type: "CALIBRATION_LOADED",
      profile: expect.objectContaining({ answers: STUDY_ANSWERS, loggingConsent: true }),
      resolvedScope: "study"
    });
  });
});

describe("logging consent during a study session", () => {
  const ENTRY = {
    issueId: "contrast:1:1",
    optionChosen: "a" as const,
    beforeHex: "#AAAAAA",
    beforeRatio: 2,
    afterHex: "#000000",
    afterRatio: 21,
    wasBound: false,
    wheelOpened: false,
    hexRejected: false,
    abandoned: false,
    scope: "instances" as const,
    instanceCount: 1,
    loggedAt: "2026-10-06T09:05:00.000Z"
  };

  it("logs even though the stored profile declined consent, and records where consent came from", async () => {
    fileData.set(STORAGE_KEY_PROFILE, JSON.stringify(FILE_PROFILE));
    putSession(startedSession());

    await logAdjustEvent(ENTRY);

    expect(loadAdjustLog()).toEqual([{ ...ENTRY, consentSource: "study-session" }]);
  });

  it("does not log without a session when the stored profile declined", async () => {
    fileData.set(STORAGE_KEY_PROFILE, JSON.stringify(FILE_PROFILE));

    await logAdjustEvent(ENTRY);

    expect(fileData.has(STORAGE_KEY_ADJUST_LOG)).toBe(false);
  });

  it("adds no consent source outside a session", async () => {
    fileData.set(STORAGE_KEY_PROFILE, JSON.stringify({ ...FILE_PROFILE, loggingConsent: true }));

    await logAdjustEvent(ENTRY);

    expect(loadAdjustLog()).toEqual([ENTRY]);
  });
});
