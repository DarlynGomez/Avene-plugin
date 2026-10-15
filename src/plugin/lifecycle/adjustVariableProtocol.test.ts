import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ISSUE_ID = "contrast:1:1";
const VARIABLE_ID = "VariableID:1:1";
const COLLECTION_ID = "VariableCollectionId:1:1";
const MODE_ID = "1:0";
const WHITE_PAGE = { type: "PAGE", backgrounds: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }] };

function textNode(overrides: Record<string, unknown> = {}) {
  return {
    id: "1:1",
    name: "Body copy",
    type: "TEXT",
    fontSize: 16,
    fontName: { family: "Inter", style: "Regular" },
    fontWeight: 400,
    fills: [
      {
        type: "SOLID",
        color: { r: 0, g: 0, b: 0 },
        boundVariables: { color: { type: "VARIABLE_ALIAS", id: VARIABLE_ID } }
      }
    ],
    opacity: 1,
    blendMode: "NORMAL",
    visible: true,
    parent: WHITE_PAGE,
    resolvedVariableModes: { [COLLECTION_ID]: MODE_ID },
    ...overrides
  };
}

function stubVariable(remote: boolean) {
  const setValueForMode = vi.fn();
  const variable = {
    id: VARIABLE_ID,
    name: "sage/muted",
    remote,
    variableCollectionId: COLLECTION_ID,
    valuesByMode: { [MODE_ID]: { r: 0, g: 0, b: 0 } },
    setValueForMode
  };
  const collection = {
    id: COLLECTION_ID,
    name: "Brand colors",
    defaultModeId: MODE_ID,
    modes: [{ modeId: MODE_ID, name: "Default" }]
  };
  return { variable, collection, setValueForMode };
}

describe("adjust variable protocol", () => {
  function stubFigma(
    node: ReturnType<typeof textNode>,
    otherNodes: ReturnType<typeof textNode>[],
    variableStub: ReturnType<typeof stubVariable>
  ) {
    const commitUndo = vi.fn();
    const allNodes = [node, ...otherNodes];
    const getNodeByIdAsync = vi.fn(
      async (id: string) => allNodes.find((candidate) => candidate.id === id) ?? null
    );
    const pluginData: Record<string, string> = {};
    const getPluginData = vi.fn((key: string) => pluginData[key] ?? "");
    const setPluginData = vi.fn((key: string, value: string) => {
      pluginData[key] = value;
    });

    vi.stubGlobal("figma", {
      mixed: Symbol("figma.mixed"),
      getNodeByIdAsync,
      commitUndo,
      loadFontAsync: vi.fn().mockResolvedValue(undefined),
      variables: {
        getVariableByIdAsync: vi.fn(async (id: string) =>
          id === VARIABLE_ID ? variableStub.variable : null
        ),
        getVariableCollectionByIdAsync: vi.fn(async (id: string) =>
          id === COLLECTION_ID ? variableStub.collection : null
        )
      },
      getStyleByIdAsync: vi.fn(),
      root: { getPluginData, setPluginData },
      clientStorage: { getAsync: vi.fn().mockResolvedValue(undefined) },
      currentPage: {
        findAll: (predicate: (candidate: unknown) => boolean) => allNodes.filter(predicate),
        findAllWithCriteria: () => allNodes
      },
      ui: { postMessage: vi.fn() }
    });
    return { commitUndo, pluginData };
  }

  // The flag is off by default so these tests turn it on explicitly
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("../../shared/featureFlags", () => ({
      FEATURE_VARIABLE_SCOPE: true,
      FEATURE_MARKERS: false
    }));
  });

  afterEach(() => {
    vi.doUnmock("../../shared/featureFlags");
    vi.unstubAllGlobals();
  });

  it("reports total consumers and newly failing count for a candidate color", async () => {
    const node = textNode();
    const second = textNode({ id: "1:2", name: "Second consumer" });
    const variableStub = stubVariable(false);
    stubFigma(node, [second], variableStub);

    const { handleAdjustMessage } = await import("./adjustProtocol");
    const reply = vi.fn();
    await handleAdjustMessage(
      {
        type: "ADJUST_VARIABLE_CONSEQUENCE_REQUEST",
        issueId: ISSUE_ID,
        variableId: VARIABLE_ID,
        color: { r: 0.95, g: 0.95, b: 0.95 }
      },
      reply
    );

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ADJUST_VARIABLE_CONSEQUENCE_READY",
        issueId: ISSUE_ID,
        totalConsumers: 2,
        newlyFailingCount: 2
      })
    );
  });

  it("writes the variable's mode value and commits one undo step", async () => {
    const node = textNode();
    const variableStub = stubVariable(false);
    const { commitUndo } = stubFigma(node, [], variableStub);

    const { handleAdjustMessage } = await import("./adjustProtocol");
    const reply = vi.fn();
    await handleAdjustMessage(
      {
        type: "ADJUST_APPLY_VARIABLE",
        issueId: ISSUE_ID,
        variableId: VARIABLE_ID,
        color: { r: 0, g: 0, b: 0.2 },
        optionChosen: "c",
        wheelOpened: true,
        hexRejected: false
      },
      reply
    );

    expect(variableStub.setValueForMode).toHaveBeenCalledWith(MODE_ID, { r: 0, g: 0, b: 0.2 });
    expect(commitUndo).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledWith({ type: "ADJUST_APPLIED", issueId: ISSUE_ID });
  });

  it("refuses to write a remote (library) variable", async () => {
    const node = textNode();
    const variableStub = stubVariable(true);
    const { commitUndo } = stubFigma(node, [], variableStub);

    const { handleAdjustMessage } = await import("./adjustProtocol");
    const reply = vi.fn();
    await handleAdjustMessage(
      {
        type: "ADJUST_APPLY_VARIABLE",
        issueId: ISSUE_ID,
        variableId: VARIABLE_ID,
        color: { r: 0, g: 0, b: 0.2 },
        optionChosen: "c",
        wheelOpened: false,
        hexRejected: false
      },
      reply
    );

    expect(variableStub.setValueForMode).not.toHaveBeenCalled();
    expect(commitUndo).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ADJUST_ACTION_FAILED", issueId: ISSUE_ID })
    );
  });

  it("refuses a color that no longer meets the required ratio", async () => {
    const node = textNode();
    const variableStub = stubVariable(false);
    const { commitUndo } = stubFigma(node, [], variableStub);

    const { handleAdjustMessage } = await import("./adjustProtocol");
    const reply = vi.fn();
    const failingColor = { r: 0.9, g: 0.9, b: 0.9 };
    await handleAdjustMessage(
      {
        type: "ADJUST_APPLY_VARIABLE",
        issueId: ISSUE_ID,
        variableId: VARIABLE_ID,
        color: failingColor,
        optionChosen: "c",
        wheelOpened: false,
        hexRejected: false
      },
      reply
    );

    expect(variableStub.setValueForMode).not.toHaveBeenCalled();
    expect(commitUndo).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ADJUST_ACTION_FAILED", issueId: ISSUE_ID })
    );
  });
});
