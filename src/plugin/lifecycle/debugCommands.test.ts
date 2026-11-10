import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { endBlock, exitStudy, recordExport } from "../../shared/study/sessionTransitions";
import { LIVE_CTX, POST_DESIGNING_CTX, sessionFor } from "../../shared/study/studyEventFixtures";
import type { StudySession } from "../../shared/study/studyTypes";
import { STORAGE_KEY_STUDY_SESSION } from "../storage/storageKeys";
import { saveStudySession } from "../study/adapter/studySessionStore";
import { runDetectionCheck } from "./detectionCheck";
import { DEBUG_COMMANDS, runDebugCommand } from "./debugCommands";
import { exportIssuesToConsole } from "./exportIssuesDebug";

vi.mock("./detectionCheck", () => ({ runDetectionCheck: vi.fn(async () => undefined) }));
vi.mock("./exportIssuesDebug", () => ({ exportIssuesToConsole: vi.fn(async () => undefined) }));

const notify = vi.fn();
const closePlugin = vi.fn();
let store: Map<string, string>;

const clock = () => "2026-10-11T10:00:00.000Z";

function stubFigma() {
  store = new Map();
  vi.stubGlobal("figma", {
    notify,
    closePlugin,
    root: {
      getPluginData: (key: string) => store.get(key) ?? "",
      setPluginData: (key: string, value: string) => void store.set(key, value)
    }
  });
}

/** What the researcher's panel does to the stored session, through the same pure transitions */
function advance(step: (session: StudySession) => ReturnType<typeof endBlock>) {
  const current = JSON.parse(store.get(STORAGE_KEY_STUDY_SESSION) ?? "") as StudySession;
  const result = step(current);
  if (!result.ok) throw new Error(result.refusal.reason);
  saveStudySession(result.session);
}

beforeEach(() => {
  vi.clearAllMocks();
  stubFigma();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the development menu commands", () => {
  it("lists the three commands that show or erase study data", () => {
    expect(DEBUG_COMMANDS).toEqual(["export-issues", "detection-check", "reset-study"]);
  });

  it.each(["export-issues", "detection-check", "reset-study"])(
    "%s refuses and closes while a live session is running",
    async (command) => {
      saveStudySession(sessionFor(LIVE_CTX));

      await runDebugCommand(command);

      expect(notify).toHaveBeenCalledWith(expect.stringContaining("study session"), {
        error: true
      });
      expect(closePlugin).toHaveBeenCalledTimes(1);
      expect(runDetectionCheck).not.toHaveBeenCalled();
      expect(exportIssuesToConsole).not.toHaveBeenCalled();
      expect(store.get(STORAGE_KEY_STUDY_SESSION)).not.toBe("");
    }
  );

  it("refuses during a post-task block as well", async () => {
    saveStudySession(sessionFor(POST_DESIGNING_CTX));

    await runDebugCommand("detection-check");

    expect(runDetectionCheck).not.toHaveBeenCalled();
    expect(closePlugin).toHaveBeenCalledTimes(1);
  });

  it("runs the detection check and the export when there is no session", async () => {
    await runDebugCommand("detection-check");
    await runDebugCommand("export-issues");

    expect(runDetectionCheck).toHaveBeenCalledTimes(1);
    expect(exportIssuesToConsole).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalledWith(expect.stringContaining("study session"), {
      error: true
    });
  });

  it("still refuses after the block has ended, until the researcher exits", async () => {
    saveStudySession(sessionFor(LIVE_CTX));
    advance((session) => endBlock(session, clock));
    advance((session) => recordExport(session, clock));

    await runDebugCommand("reset-study");

    expect(closePlugin).toHaveBeenCalledTimes(1);
    expect(store.get(STORAGE_KEY_STUDY_SESSION)).not.toBe("");
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("study session"), { error: true });
  });

  it("resets after end, export and exit, and clears the session record", async () => {
    saveStudySession(sessionFor(LIVE_CTX));
    advance((session) => endBlock(session, clock));
    advance((session) => recordExport(session, clock));
    advance((session) => exitStudy(session, clock));

    await runDebugCommand("reset-study");

    expect(store.get(STORAGE_KEY_STUDY_SESSION)).toBe("");
    expect(notify).toHaveBeenCalledWith(
      "Cleared the study session and recorded issues, decisions and Adjust log",
      undefined
    );
    expect(closePlugin).toHaveBeenCalledTimes(1);
  });

  it("resets a file that never had a session", async () => {
    await runDebugCommand("reset-study");

    expect(notify).toHaveBeenCalledWith(
      "Cleared the study session and recorded issues, decisions and Adjust log",
      undefined
    );
  });
});
