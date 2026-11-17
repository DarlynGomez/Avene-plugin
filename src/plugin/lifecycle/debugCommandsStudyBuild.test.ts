import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { endBlock, exitStudy, recordExport } from "../../shared/study/sessionTransitions";
import { LIVE_CTX, sessionFor } from "../../shared/study/studyEventFixtures";
import { STORAGE_KEY_STUDY_SESSION } from "../storage/storageKeys";
import { saveStudySession } from "../study/adapter/studySessionStore";
import { runDetectionCheck } from "./detectionCheck";
import { runDebugCommand } from "./debugCommands";
import { exportIssuesToConsole } from "./exportIssuesDebug";

vi.mock("./detectionCheck", () => ({ runDetectionCheck: vi.fn(async () => undefined) }));
vi.mock("./exportIssuesDebug", () => ({ exportIssuesToConsole: vi.fn(async () => undefined) }));

const notify = vi.fn();
const closePlugin = vi.fn();
let store: Map<string, string>;
const clock = () => "2026-11-17T10:00:00.000Z";

beforeEach(() => {
  vi.clearAllMocks();
  store = new Map();
  vi.stubGlobal("figma", {
    notify,
    closePlugin,
    root: {
      getPluginData: (key: string) => store.get(key) ?? "",
      setPluginData: (key: string, value: string) => void store.set(key, value)
    }
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("the menu commands in the study build, which is what a plain run is", () => {
  it("never resets the study records, even after the researcher has exited", async () => {
    const session = sessionFor(LIVE_CTX);
    const ended = endBlock(session, clock);
    if (!ended.ok) throw new Error("the block could not end");
    const exported = recordExport(ended.session, clock);
    if (!exported.ok) throw new Error("the export could not be noted");
    const exited = exitStudy(exported.session, clock);
    if (!exited.ok) throw new Error("study mode could not be exited");
    saveStudySession(exited.session);
    const before = store.get(STORAGE_KEY_STUDY_SESSION);

    await runDebugCommand("reset-study");

    expect(store.get(STORAGE_KEY_STUDY_SESSION)).toBe(before);
    expect(notify).toHaveBeenCalledWith("This command is off in the study build", { error: true });
    expect(closePlugin).toHaveBeenCalledTimes(1);
  });

  it("refuses the reset in a file that never had a session too", async () => {
    await runDebugCommand("reset-study");
    expect(notify).toHaveBeenCalledWith("This command is off in the study build", { error: true });
    expect(store.size).toBe(0);
  });

  it("still runs the read only detection check and issue export when no session is active", async () => {
    await runDebugCommand("detection-check");
    await runDebugCommand("export-issues");
    expect(runDetectionCheck).toHaveBeenCalledTimes(1);
    expect(exportIssuesToConsole).toHaveBeenCalledTimes(1);
  });
});
