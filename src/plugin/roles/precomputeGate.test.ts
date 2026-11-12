import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudySession } from "../../shared/study/studyTypes";
import { PRECOMPUTE_ROLES_COMMAND } from "./adapter/precompute";
import { PRECOMPUTE_OFF_IN_STUDY, refusePrecomputeInStudy } from "./adapter/precomputeGate";

const SESSION: StudySession = {
  schemaVersion: 1,
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  consentConfirmedAt: "t",
  phase: "designing",
  startedAt: "t",
  revealedAt: null,
  endedAt: null,
  exports: [],
  exitedAt: null
};

const notify = vi.fn();
const closePlugin = vi.fn();
let stored = "";

beforeEach(() => {
  notify.mockClear();
  closePlugin.mockClear();
  stored = "";
  vi.stubGlobal("figma", {
    notify,
    closePlugin,
    root: { getPluginData: () => stored }
  });
});
afterEach(() => vi.unstubAllGlobals());

const putSession = (session: StudySession) => {
  stored = JSON.stringify(session);
};

describe("refusePrecomputeInStudy", () => {
  it("refuses the command while a session is active, with a notice and the plugin closed", () => {
    putSession(SESSION);
    expect(refusePrecomputeInStudy(PRECOMPUTE_ROLES_COMMAND)).toBe(true);
    expect(notify).toHaveBeenCalledWith(PRECOMPUTE_OFF_IN_STUDY, { error: true });
    expect(closePlugin).toHaveBeenCalledTimes(1);
  });

  it("refuses in every active phase, an ended block included", () => {
    putSession({ ...SESSION, phase: "ended", endedAt: "t" });
    expect(refusePrecomputeInStudy(PRECOMPUTE_ROLES_COMMAND)).toBe(true);
  });

  it("lets the command run with no session", () => {
    expect(refusePrecomputeInStudy(PRECOMPUTE_ROLES_COMMAND)).toBe(false);
    expect(notify).not.toHaveBeenCalled();
    expect(closePlugin).not.toHaveBeenCalled();
  });

  it("lets the command run once the researcher has exited", () => {
    putSession({ ...SESSION, exitedAt: "t" });
    expect(refusePrecomputeInStudy(PRECOMPUTE_ROLES_COMMAND)).toBe(false);
    expect(closePlugin).not.toHaveBeenCalled();
  });

  it("does not touch any other command, in a session or not", () => {
    putSession(SESSION);
    expect(refusePrecomputeInStudy("open")).toBe(false);
    expect(refusePrecomputeInStudy("export-role-suggestions")).toBe(false);
    expect(notify).not.toHaveBeenCalled();
  });
});
