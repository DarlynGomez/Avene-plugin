import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEY_STUDY_SESSION } from "../storage/storageKeys";

const ISSUE_ID = "contrast:1:1";
const SESSION = {
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
const SCOPE = {
  variableId: "VariableID:1:1",
  name: "sage/muted",
  collectionName: "Brand colours",
  modeName: "Default",
  remote: false
};

let pluginData: Record<string, string>;

beforeEach(() => {
  vi.resetModules();
  pluginData = {};
  // The flag is forced on, which stands in for any development override
  vi.doMock("../../shared/featureFlags", () => ({ FEATURE_VARIABLE_SCOPE: true }));
  vi.doMock("../adjust/adapter/variableScope", () => ({
    resolveVariableScope: vi.fn().mockResolvedValue(SCOPE)
  }));
  vi.doMock("../adjust/adapter/filePalette", () => ({
    collectFilePalette: vi.fn().mockResolvedValue([])
  }));
  vi.doMock("../adjust/adapter/bindingLookup", () => ({
    detectFillBinding: vi.fn().mockResolvedValue(null)
  }));
  vi.stubGlobal("figma", {
    mixed: Symbol("figma.mixed"),
    root: { getPluginData: (key: string) => pluginData[key] ?? "", setPluginData: vi.fn() },
    getNodeByIdAsync: vi.fn().mockResolvedValue({ id: "1:1", type: "TEXT" }),
    variables: { getVariableByIdAsync: vi.fn() }
  });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.doUnmock("../../shared/featureFlags");
  vi.doUnmock("../adjust/adapter/variableScope");
  vi.doUnmock("../adjust/adapter/filePalette");
  vi.doUnmock("../adjust/adapter/bindingLookup");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function activate(patch: Record<string, unknown> = {}) {
  pluginData[STORAGE_KEY_STUDY_SESSION] = JSON.stringify({ ...SESSION, ...patch });
}

async function send(message: Parameters<typeof import("./adjustProtocol").handleAdjustMessage>[0]) {
  const { handleAdjustMessage } = await import("./adjustProtocol");
  const reply = vi.fn();
  await handleAdjustMessage(message, reply);
  return reply;
}

describe("variable scope with the flag forced on", () => {
  it("is offered when there is no session", async () => {
    const reply = await send({ type: "ADJUST_OPTIONS_REQUEST", issueId: ISSUE_ID });

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ADJUST_OPTIONS_READY", variableScope: SCOPE })
    );
  });

  it("is reported as none while a session is active", async () => {
    activate();
    const reply = await send({ type: "ADJUST_OPTIONS_REQUEST", issueId: ISSUE_ID });

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ADJUST_OPTIONS_READY", variableScope: null })
    );
  });

  it("refuses a variable apply during a session without touching the variable", async () => {
    activate();
    const reply = await send({
      type: "ADJUST_APPLY_VARIABLE",
      issueId: ISSUE_ID,
      variableId: SCOPE.variableId,
      color: { r: 0, g: 0, b: 0.2 },
      optionChosen: "a",
      wheelOpened: false,
      hexRejected: false
    });

    expect(reply).toHaveBeenCalledWith(expect.objectContaining({ type: "ADJUST_ACTION_FAILED" }));
    expect(figma.variables.getVariableByIdAsync).not.toHaveBeenCalled();
  });

  it("refuses a consequence request during a session", async () => {
    activate({ phase: "reviewing", condition: "post-task", revealedAt: "t" });
    const reply = await send({
      type: "ADJUST_VARIABLE_CONSEQUENCE_REQUEST",
      issueId: ISSUE_ID,
      variableId: SCOPE.variableId,
      color: { r: 0, g: 0, b: 0.2 }
    });

    expect(reply).toHaveBeenCalledWith(expect.objectContaining({ type: "ADJUST_ACTION_FAILED" }));
  });

  it("stays off after the block ends, until the researcher exits", async () => {
    activate({ phase: "ended", endedAt: "t" });
    const reply = await send({ type: "ADJUST_OPTIONS_REQUEST", issueId: ISSUE_ID });

    expect(reply).toHaveBeenCalledWith(expect.objectContaining({ variableScope: null }));
  });

  it("comes back after study mode is exited", async () => {
    activate({ exitedAt: "t" });
    const reply = await send({ type: "ADJUST_OPTIONS_REQUEST", issueId: ISSUE_ID });

    expect(reply).toHaveBeenCalledWith(expect.objectContaining({ variableScope: SCOPE }));
  });

  it("fails closed when the session cannot be read", async () => {
    vi.stubGlobal("figma", {
      mixed: Symbol("figma.mixed"),
      root: {
        getPluginData: () => {
          throw new Error("storage unavailable");
        }
      },
      getNodeByIdAsync: vi.fn().mockResolvedValue({ id: "1:1", type: "TEXT" })
    });
    const reply = await send({ type: "ADJUST_OPTIONS_REQUEST", issueId: ISSUE_ID });

    expect(reply).toHaveBeenCalledWith(expect.objectContaining({ variableScope: null }));
  });
});
