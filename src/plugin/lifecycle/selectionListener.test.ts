import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Markers are on in the build, these tests are about other things and their fake file cannot hold markers
vi.mock("../../shared/featureFlags", async (original) => ({
  ...(await original<typeof import("../../shared/featureFlags")>()),
  FEATURE_MARKERS: false
}));

const DEFERRED = {
  state: "deferred",
  severityAtLastDetection: "high",
  encounterCount: 0,
  lastDetectedAt: "2026-09-08T00:00:00.000Z"
};

const TEXT_NODE = { id: "1:1", type: "TEXT" };
const FRAME_NODE = { id: "frame:1", type: "FRAME", children: [TEXT_NODE] };

describe("selectionListener", () => {
  const getPluginData = vi.fn();
  const setPluginData = vi.fn();
  const getNodeByIdAsync = vi.fn();
  const uiPostMessage = vi.fn();
  let selection: unknown[] = [];
  const currentPage = {
    get selection() {
      return selection;
    }
  };

  beforeEach(() => {
    selection = [];
    getPluginData.mockReset();
    setPluginData.mockReset();
    getNodeByIdAsync.mockReset();
    uiPostMessage.mockReset();
    getPluginData.mockReturnValue(JSON.stringify({ "contrast:1:1": DEFERRED }));
    getNodeByIdAsync.mockResolvedValue(TEXT_NODE);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("figma", {
      root: { getPluginData, setPluginData },
      getNodeByIdAsync,
      currentPage,
      ui: { postMessage: uiPostMessage }
    });
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("resurfaces via an ancestor: selecting the containing frame counts as selecting the text node inside it", async () => {
    const { handleSelectionChange } = await import("./selectionListener");

    selection = [FRAME_NODE];
    await handleSelectionChange();

    expect(setPluginData).toHaveBeenCalledTimes(1);
    const persisted = JSON.parse(setPluginData.mock.calls[0][1]);
    expect(persisted["contrast:1:1"]).toMatchObject({ encounterCount: 1 });
    expect(uiPostMessage).toHaveBeenCalledTimes(1);
  });

  it("does not resurface while selection is empty", async () => {
    const { handleSelectionChange } = await import("./selectionListener");

    await handleSelectionChange();

    expect(setPluginData).not.toHaveBeenCalled();
  });

  it("markIssueDeferred arms the guard so an immediate reselect does not resurface it", async () => {
    const { handleSelectionChange, markIssueDeferred } = await import("./selectionListener");

    markIssueDeferred("contrast:1:1");
    selection = [TEXT_NODE];
    await handleSelectionChange();

    expect(setPluginData).not.toHaveBeenCalled();
  });

  it("resurfaces only after selection leaves and returns following a deferred mark", async () => {
    const { handleSelectionChange, markIssueDeferred } = await import("./selectionListener");

    markIssueDeferred("contrast:1:1");
    selection = [TEXT_NODE];
    await handleSelectionChange();
    expect(setPluginData).not.toHaveBeenCalled();

    selection = [];
    await handleSelectionChange();
    expect(setPluginData).not.toHaveBeenCalled();

    selection = [TEXT_NODE];
    await handleSelectionChange();
    const persisted = JSON.parse(setPluginData.mock.calls[0][1]);
    expect(persisted["contrast:1:1"]).toMatchObject({ encounterCount: 1 });
  });

  it("initializes the guard as already armed for a deferred issue selected at startup", async () => {
    const { handleSelectionChange, initializeReEncounterFromCurrentSelection } =
      await import("./selectionListener");

    selection = [TEXT_NODE];
    await initializeReEncounterFromCurrentSelection();

    // Reopening with the node still selected must not resurface it
    await handleSelectionChange();
    expect(setPluginData).not.toHaveBeenCalled();
  });
});
