import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Marker } from "../../../shared/markers/markerSet";
import { createMarkerRenderer } from "./markerRenderer";
import { createFakeFigma } from "./markerFigmaStub";

const scanAndSync = vi.fn(async () => undefined);
vi.mock("../../lifecycle/scanAndSync", () => ({
  scanAndSync: (...args: unknown[]) => scanAndSync(...(args as []))
}));

const marker = (nodeId: string): Marker => ({
  signature: `r:${nodeId}`,
  screenId: "A",
  issueId: `contrast:${nodeId}`,
  nodeId,
  label: "L"
});

describe("annotation changes and the real document change listener", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    scanAndSync.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function register(fake: ReturnType<typeof createFakeFigma>) {
    const { registerDocumentChangeListener } = await import("../../lifecycle/listeners");
    registerDocumentChangeListener();
    expect(fake.documentChangeHandlers.length).toBe(1);
  }

  it("never triggers a rescan across a full write, swap and close", async () => {
    const fake = createFakeFigma();
    fake.install();
    for (const id of ["1:1", "1:2", "1:3"]) fake.addNode(id);
    await register(fake);
    const renderer = createMarkerRenderer("s1");

    await renderer.show("A", [marker("1:1"), marker("1:2")]);
    await renderer.show("A", [marker("1:3")]);
    await renderer.clear();
    await renderer.show("A", [marker("1:1")]);
    renderer.clearSync();
    await vi.advanceTimersByTimeAsync(5000);

    expect(fake.calls.some((call) => call.startsWith("annotations:"))).toBe(true);
    expect(scanAndSync).not.toHaveBeenCalled();
  });

  it("discards an annotations or plugin data change on its own", async () => {
    const fake = createFakeFigma();
    fake.install();
    await register(fake);
    for (const properties of [["annotations"], ["pluginData"], ["annotations", "pluginData"]]) {
      fake.documentChangeHandlers[0]?.({
        documentChanges: [{ type: "PROPERTY_CHANGE", id: "1:1", properties }]
      });
    }
    await vi.advanceTimersByTimeAsync(5000);

    expect(scanAndSync).not.toHaveBeenCalled();
  });

  it("still rescans on a change that matters, so the harness is not just silent", async () => {
    const fake = createFakeFigma();
    fake.install();
    await register(fake);
    fake.documentChangeHandlers[0]?.({
      documentChanges: [{ type: "PROPERTY_CHANGE", id: "1:1", properties: ["fills"] }]
    });
    await vi.advanceTimersByTimeAsync(5000);

    expect(scanAndSync).toHaveBeenCalledTimes(1);
  });
});
