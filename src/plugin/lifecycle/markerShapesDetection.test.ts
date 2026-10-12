import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMarkerRenderer } from "../markers/adapter/markerRenderer";
import { createFakeFigma } from "../markers/adapter/markerFigmaStub";

let data: Map<string, string>;
let posted: unknown[];
let fake: ReturnType<typeof createFakeFigma>;

beforeEach(async () => {
  fake = createFakeFigma();
  fake.install();
  data = new Map();
  posted = [];
  const base = (globalThis as unknown as { figma: Record<string, unknown> }).figma;
  vi.stubGlobal("figma", {
    ...base,
    mixed: Symbol("figma.mixed"),
    root: {
      ...(base.root as object),
      getPluginData: (key: string) => data.get(key) ?? "",
      setPluginData: (key: string, value: string) => void data.set(key, value)
    },
    ui: { postMessage: (message: unknown) => void posted.push(message) }
  });
  fake.addNode("1:1", [], "", { x: 100, y: 200, width: 80, height: 20 });
  await createMarkerRenderer("s1").show(
    "A",
    [{ signature: "r1", screenId: "A", issueId: "contrast:1:1", nodeId: "1:1", label: "2.2" }],
    "dot"
  );
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const drawnIds = () =>
  [...fake.nodes.values()].filter((node) => node.type !== "TEXT").map((node) => node.id);

describe("detection and drawn shapes", () => {
  it("does not read a shape or the frame, they hold no text, so scanning them makes no issue", async () => {
    const { scanAndSync } = await import("./scanAndSync");
    await scanAndSync(new Set(drawnIds()), "scan of shapes");

    expect(drawnIds()).toHaveLength(2);
    expect(JSON.parse(data.get("cadt.issues.v1") || "{}")).toEqual({});
    // Scanning does push a list, which is why the listener must never ask for it
    expect(posted.every((message) => (message as { issues: unknown[] }).issues.length === 0)).toBe(
      true
    );
  });

  it("does not resolve a shape to a snapshot", async () => {
    const { resolveTextNodeSnapshot } = await import("./resolveSnapshot");

    for (const id of drawnIds()) expect(await resolveTextNodeSnapshot(id)).toBeNull();
  });
});

describe("the fresh file check and drawn shapes", () => {
  it("does not count them, a file holding only shapes is still fresh", async () => {
    const { gatherFreshFileInputs } = await import("../study/adapter/freshFileInputs");
    const { checkFreshFile } = await import("../../shared/study/freshFile");

    expect(drawnIds()).toHaveLength(2);
    expect(checkFreshFile(gatherFreshFileInputs())).toEqual({ fresh: true });
  });
});
