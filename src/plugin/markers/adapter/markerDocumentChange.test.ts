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

describe("drawn shapes and the real document change listener", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    scanAndSync.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const BOX = { x: 100, y: 200, width: 80, height: 20 };

  async function register(fake: ReturnType<typeof createFakeFigma>) {
    const { registerDocumentChangeListener } = await import("../../lifecycle/listeners");
    registerDocumentChangeListener();
    expect(fake.documentChangeHandlers.length).toBe(1);
  }

  it("never scans for creating, moving, restyling or deleting them across a full cycle", async () => {
    const fake = createFakeFigma();
    fake.install();
    for (const id of ["1:1", "1:2"]) fake.addNode(id, [], "", BOX);
    await register(fake);
    const renderer = createMarkerRenderer("s1");

    await renderer.show("A", [marker("1:1"), marker("1:2")], "dot");
    await renderer.show("A", [marker("1:1")], "ring");
    await renderer.show("B", [], "ring");
    await renderer.show("A", [marker("1:1")], "dot");
    renderer.clearSync();
    await vi.advanceTimersByTimeAsync(5000);

    expect(fake.calls.some((call) => call.startsWith("create:"))).toBe(true);
    expect(fake.calls.some((call) => call.startsWith("remove:"))).toBe(true);
    expect(scanAndSync).not.toHaveBeenCalled();
  });

  it("ignores a shape or the frame a designer changes, even a change that normally matters", async () => {
    const fake = createFakeFigma();
    fake.install();
    fake.addNode("1:1", [], "", BOX);
    await register(fake);
    await createMarkerRenderer("s1").show("A", [marker("1:1")], "dot");
    const shapeIds = [...fake.nodes.values()]
      .filter((node) => node.type !== "TEXT")
      .map((node) => node.id);
    scanAndSync.mockClear();

    for (const id of shapeIds) {
      for (const properties of [["fills"], ["visible"], ["parent"], ["x", "y"], ["opacity"]]) {
        fake.emit(id, properties);
      }
      fake.emitChange({ type: "DELETE", id });
    }
    await vi.advanceTimersByTimeAsync(5000);

    expect(shapeIds.length).toBe(2);
    expect(scanAndSync).not.toHaveBeenCalled();
  });

  it("ignores a copy of a shape that carries our tag, and still scans an ordinary new layer", async () => {
    const fake = createFakeFigma();
    fake.install();
    await register(fake);
    const copy = fake.addNode(
      "copy:1",
      [],
      JSON.stringify({ userId: "u1", sessionId: "s1", kind: "shape" })
    );
    const plain = fake.addNode("plain:1");
    scanAndSync.mockClear();

    fake.emitChange({ type: "CREATE", id: copy.id, node: copy });
    await vi.advanceTimersByTimeAsync(5000);
    expect(scanAndSync).not.toHaveBeenCalled();

    fake.emitChange({ type: "CREATE", id: plain.id, node: plain });
    await vi.advanceTimersByTimeAsync(5000);
    expect(scanAndSync).toHaveBeenCalledTimes(1);
  });
});
