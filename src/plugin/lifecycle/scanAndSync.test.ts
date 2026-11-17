import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scanAndSync } from "./scanAndSync";

// Markers are on in the build, these tests are about other things and their fake file cannot hold markers
vi.mock("../../shared/featureFlags", async (original) => ({
  ...(await original<typeof import("../../shared/featureFlags")>()),
  FEATURE_MARKERS: false
}));

const PAGE = { type: "PAGE", backgrounds: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }] };

function failingTextNode(id: string) {
  return {
    id,
    name: "Body copy",
    type: "TEXT",
    fontSize: 16,
    fontName: { family: "Inter", style: "Regular" },
    fills: [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.95 } }],
    opacity: 1,
    blendMode: "NORMAL",
    visible: true,
    parent: PAGE
  };
}

describe("scanAndSync", () => {
  const getPluginData = vi.fn();
  const setPluginData = vi.fn();
  const getNodeByIdAsync = vi.fn();
  const uiPostMessage = vi.fn();

  beforeEach(() => {
    getPluginData.mockReset();
    setPluginData.mockReset();
    getNodeByIdAsync.mockReset();
    uiPostMessage.mockReset();
    getPluginData.mockReturnValue("");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.stubGlobal("figma", {
      mixed: Symbol("figma.mixed"),
      root: { getPluginData, setPluginData },
      getNodeByIdAsync,
      ui: { postMessage: uiPostMessage }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does nothing when the scanned set is empty", async () => {
    await scanAndSync(new Set(), "test");
    expect(setPluginData).not.toHaveBeenCalled();
    expect(uiPostMessage).not.toHaveBeenCalled();
  });

  it("creates an open issue from a genuine finding and pushes it to the UI", async () => {
    getNodeByIdAsync.mockResolvedValue(failingTextNode("1:1"));

    await scanAndSync(new Set(["1:1"]), "test");

    expect(setPluginData).toHaveBeenCalledTimes(1);
    const [, written] = setPluginData.mock.calls[0];
    const persisted = JSON.parse(written);
    expect(persisted["contrast:1:1"]).toMatchObject({ state: "open" });

    expect(uiPostMessage).toHaveBeenCalledTimes(1);
    const pushed = uiPostMessage.mock.calls[0][0];
    expect(pushed.type).toBe("ISSUES_UPDATED");
    expect(pushed.issues).toMatchObject([
      { id: "contrast:1:1", nodeName: "Body copy", state: "open" }
    ]);
  });

  it("resolves an existing issue, without deleting the record, when the node no longer fails", async () => {
    getPluginData.mockReturnValue(
      JSON.stringify({
        "contrast:1:1": {
          state: "deferred",
          severityAtLastDetection: "high",
          encounterCount: 1,
          lastDetectedAt: "2026-09-08T00:00:00.000Z"
        }
      })
    );
    getNodeByIdAsync.mockResolvedValue(null);

    await scanAndSync(new Set(["1:1"]), "test");

    const persisted = JSON.parse(setPluginData.mock.calls[0][1]);
    expect(persisted["contrast:1:1"]).toMatchObject({ state: "resolved", encounterCount: 1 });
  });

  it("logs and does not push an update when the save itself fails", async () => {
    setPluginData.mockImplementation(() => {
      throw new Error("read-only document");
    });
    getNodeByIdAsync.mockResolvedValue(failingTextNode("1:1"));

    await scanAndSync(new Set(["1:1"]), "test");

    expect(console.error).toHaveBeenCalled();
    expect(uiPostMessage).not.toHaveBeenCalled();
  });
});
