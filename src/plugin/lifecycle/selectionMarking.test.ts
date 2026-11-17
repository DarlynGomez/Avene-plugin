import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Markers are on in the build, these tests are about other things and their fake file cannot hold markers
vi.mock("../../shared/featureFlags", async (original) => ({
  ...(await original<typeof import("../../shared/featureFlags")>()),
  FEATURE_MARKERS: false
}));

/** Lets a fire-and-forget async chain finish before asserting on its effects */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Runs the real listener and canvas adapter, not a hand built flag
 * Only the Figma API is mocked, with a real in-memory plugin data store
 */
describe("plugin-originated selection and re-encounter", () => {
  let pluginData: Record<string, string> = {};
  let selection: unknown[] = [];
  const getPluginData = vi.fn((key: string) => pluginData[key] ?? "");
  const setPluginData = vi.fn((key: string, value: string) => {
    pluginData[key] = value;
  });
  const uiPostMessage = vi.fn();
  const scrollAndZoomIntoView = vi.fn();

  const PAGE = { type: "PAGE", backgrounds: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }] };
  const NODES = ["1:1", "1:2", "1:3"].map((id) => ({
    id,
    name: `Text ${id}`,
    type: "TEXT",
    fontSize: 16,
    fontName: { family: "Inter", style: "Regular" },
    fills: [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.95 } }],
    opacity: 1,
    blendMode: "NORMAL",
    visible: true,
    parent: PAGE
  }));
  const getNodeByIdAsync = vi.fn(
    async (id: string) => NODES.find((node) => node.id === id) ?? null
  );
  const currentPage = {
    get selection() {
      return selection;
    },
    set selection(value: unknown[]) {
      selection = value;
    }
  };

  let selectionChangeHandler: (() => void) | undefined;
  const on = vi.fn((eventName: string, handler: () => void) => {
    if (eventName === "selectionchange") {
      selectionChangeHandler = handler;
    }
  });

  const DEFERRED = {
    state: "deferred",
    severityAtLastDetection: "high",
    encounterCount: 0,
    lastDetectedAt: "2026-09-08T00:00:00.000Z"
  };

  beforeEach(() => {
    pluginData = {
      "cadt.issues.v1": JSON.stringify({
        "contrast:1:1": DEFERRED,
        "contrast:1:2": DEFERRED,
        "contrast:1:3": DEFERRED
      })
    };
    selection = [];
    selectionChangeHandler = undefined;
    getPluginData.mockClear();
    setPluginData.mockClear();
    getNodeByIdAsync.mockClear();
    uiPostMessage.mockClear();
    scrollAndZoomIntoView.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("figma", {
      mixed: Symbol("figma.mixed"),
      root: { getPluginData, setPluginData },
      getNodeByIdAsync,
      currentPage,
      viewport: { scrollAndZoomIntoView },
      ui: { postMessage: uiPostMessage },
      on
    });
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("a plugin-set selection resurfaces nothing; the designer's own next selection resurfaces exactly once", async () => {
    const { registerSelectionChangeListener } = await import("./selectionListener");
    const { selectAndZoomToFit } = await import("../accountability/adapter/canvasSelection");
    const { loadIssues } = await import("../accountability/issueStore");

    registerSelectionChangeListener();
    expect(selectionChangeHandler).toBeDefined();

    // The plugin shows all three deferred instances on canvas at once
    await selectAndZoomToFit(["1:1", "1:2", "1:3"]);
    expect(selection).toEqual(NODES);

    // Figma would fire a selection change here so simulate it
    // The handler is fire and forget so let its promise chain settle
    selectionChangeHandler?.();
    await settle();

    const afterPluginSelection = await loadIssues();
    expect(afterPluginSelection["contrast:1:1"].encounterCount).toBe(0);
    expect(afterPluginSelection["contrast:1:2"].encounterCount).toBe(0);
    expect(afterPluginSelection["contrast:1:3"].encounterCount).toBe(0);
    expect(setPluginData).not.toHaveBeenCalled();
    expect(uiPostMessage).not.toHaveBeenCalled();

    // The designer now selects one of them directly
    selection = [NODES[1]];
    selectionChangeHandler?.();
    await vi.waitFor(async () => {
      const record = await loadIssues();
      expect(record["contrast:1:2"].encounterCount).toBe(1);
    });

    const afterDesignerSelection = await loadIssues();
    expect(afterDesignerSelection["contrast:1:1"].encounterCount).toBe(0);
    expect(afterDesignerSelection["contrast:1:3"].encounterCount).toBe(0);
    expect(uiPostMessage).toHaveBeenCalledTimes(1);

    // It resurfaces exactly once, more events on the same selection do not recount
    selectionChangeHandler?.();
    await settle();
    const stillOne = await loadIssues();
    expect(stillOne["contrast:1:2"].encounterCount).toBe(1);
  });
});
