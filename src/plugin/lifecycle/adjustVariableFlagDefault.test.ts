import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// featureFlags is not mocked in this file so it shows what the shipped default does

const ISSUE_ID = "contrast:1:1";
const COLOR = { r: 0, g: 0, b: 0.2 };

beforeEach(() => {
  vi.resetModules();
  vi.doMock("../adjust/adapter/variableScope", () => ({
    resolveVariableScope: vi.fn().mockResolvedValue({
      variableId: "VariableID:1:1",
      name: "sage/muted",
      collectionName: "Brand colors",
      modeName: "Default",
      remote: false
    })
  }));
  vi.doMock("../adjust/adapter/filePalette", () => ({
    collectFilePalette: vi.fn().mockResolvedValue([])
  }));
  vi.doMock("../adjust/adapter/bindingLookup", () => ({
    detectFillBinding: vi.fn().mockResolvedValue(null)
  }));
  vi.stubGlobal("figma", {
    mixed: Symbol("figma.mixed"),
    getNodeByIdAsync: vi.fn().mockResolvedValue({ id: "1:1", type: "TEXT" }),
    variables: {
      getVariableByIdAsync: vi.fn().mockResolvedValue({
        remote: false,
        setValueForMode: vi.fn(),
        variableCollectionId: "c"
      })
    }
  });
});

afterEach(() => {
  vi.doUnmock("../adjust/adapter/variableScope");
  vi.doUnmock("../adjust/adapter/filePalette");
  vi.doUnmock("../adjust/adapter/bindingLookup");
  vi.unstubAllGlobals();
});

describe("variable scope with the shipped default", () => {
  it("reports no variable scope for a node bound to a local variable", async () => {
    const { handleAdjustMessage } = await import("./adjustProtocol");
    const reply = vi.fn();

    await handleAdjustMessage({ type: "ADJUST_OPTIONS_REQUEST", issueId: ISSUE_ID }, reply);

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ADJUST_OPTIONS_READY", variableScope: null })
    );
  });

  it("refuses a variable apply and never reads or writes the variable", async () => {
    const { handleAdjustMessage } = await import("./adjustProtocol");
    const reply = vi.fn();

    await handleAdjustMessage(
      {
        type: "ADJUST_APPLY_VARIABLE",
        issueId: ISSUE_ID,
        variableId: "VariableID:1:1",
        color: COLOR,
        optionChosen: "a",
        wheelOpened: false,
        hexRejected: false
      },
      reply
    );

    expect(reply).toHaveBeenCalledWith(expect.objectContaining({ type: "ADJUST_ACTION_FAILED" }));
    expect(figma.variables.getVariableByIdAsync).not.toHaveBeenCalled();
  });

  it("refuses a consequence request", async () => {
    const { handleAdjustMessage } = await import("./adjustProtocol");
    const reply = vi.fn();

    await handleAdjustMessage(
      {
        type: "ADJUST_VARIABLE_CONSEQUENCE_REQUEST",
        issueId: ISSUE_ID,
        variableId: "VariableID:1:1",
        color: COLOR
      },
      reply
    );

    expect(reply).toHaveBeenCalledWith(expect.objectContaining({ type: "ADJUST_ACTION_FAILED" }));
    expect(reply).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "ADJUST_VARIABLE_CONSEQUENCE_READY" })
    );
  });
});
