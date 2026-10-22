import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scanAndSync } from "./scanAndSync";

vi.mock("./scanAndSync", () => ({ scanAndSync: vi.fn() }));
vi.mock("../detection/adapter/dependentTexts", () => ({
  dependentTextIds: (node: { texts?: string[] }) => node.texts ?? []
}));

describe("registerDocumentChangeListener", () => {
  let documentChangeHandler: ((event: { documentChanges: unknown[] }) => void) | undefined;
  const on = vi.fn((eventName: string, handler: typeof documentChangeHandler) => {
    if (eventName === "documentchange") {
      documentChangeHandler = handler;
    }
  });

  beforeEach(() => {
    documentChangeHandler = undefined;
    vi.mocked(scanAndSync).mockClear();
    vi.useFakeTimers();
    vi.stubGlobal("figma", { on });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function fireAndFlush(documentChanges: unknown[]) {
    const { registerDocumentChangeListener } = await import("./listeners");
    registerDocumentChangeListener();
    documentChangeHandler?.({ documentChanges });
    await vi.advanceTimersByTimeAsync(300);
  }

  it("scans a node whose relevant property changed", async () => {
    await fireAndFlush([{ type: "PROPERTY_CHANGE", id: "1:1", properties: ["fills"] }]);
    expect(scanAndSync).toHaveBeenCalledWith(new Set(["1:1"]), "scan");
  });

  it("does not scan for an irrelevant property change such as a move or resize", async () => {
    await fireAndFlush([{ type: "PROPERTY_CHANGE", id: "1:1", properties: ["x", "y"] }]);
    expect(scanAndSync).not.toHaveBeenCalled();
  });

  it("always scans a created node, even with no property list", async () => {
    await fireAndFlush([{ type: "CREATE", id: "1:2" }]);
    expect(scanAndSync).toHaveBeenCalledWith(new Set(["1:2"]), "scan");
  });

  it("always scans a deleted node, so its issue can resolve", async () => {
    await fireAndFlush([{ type: "DELETE", id: "1:3" }]);
    expect(scanAndSync).toHaveBeenCalledWith(new Set(["1:3"]), "scan");
  });

  describe("a layer behind or around text", () => {
    const shape = (patch: Record<string, unknown> = {}) => ({
      type: "RECTANGLE",
      removed: false,
      texts: ["9:1", "9:2"],
      ...patch
    });

    it("rescans the text on a shape or frame whose fill changed, as well as the shape", async () => {
      await fireAndFlush([
        { type: "PROPERTY_CHANGE", id: "2:2", properties: ["fills"], node: shape() }
      ]);
      expect(scanAndSync).toHaveBeenCalledWith(new Set(["2:2", "9:1", "9:2"]), "scan");
    });

    it.each(["visible", "opacity", "parent"])(
      "does so for a change of %s too",
      async (property) => {
        await fireAndFlush([
          { type: "PROPERTY_CHANGE", id: "2:2", properties: [property], node: shape() }
        ]);
        expect(scanAndSync).toHaveBeenCalledWith(new Set(["2:2", "9:1", "9:2"]), "scan");
      }
    );

    it("does not rescan the text when the shape only moved or was resized", async () => {
      await fireAndFlush([
        { type: "PROPERTY_CHANGE", id: "2:2", properties: ["x", "y", "width"], node: shape() }
      ]);
      expect(scanAndSync).not.toHaveBeenCalled();
    });

    it("does not look for dependents of a shape that was removed", async () => {
      await fireAndFlush([
        {
          type: "PROPERTY_CHANGE",
          id: "2:2",
          properties: ["fills"],
          node: shape({ removed: true })
        }
      ]);
      expect(scanAndSync).toHaveBeenCalledWith(new Set(["2:2"]), "scan");
    });

    it("rescans a text that was moved or resized, since it may now sit on something else", async () => {
      const text = { type: "TEXT", removed: false };
      await fireAndFlush([
        { type: "PROPERTY_CHANGE", id: "3:3", properties: ["x", "y"], node: text }
      ]);
      expect(scanAndSync).toHaveBeenCalledWith(new Set(["3:3"]), "scan");
    });

    it("does not rescan a shape that was moved when it is not text", async () => {
      await fireAndFlush([
        {
          type: "PROPERTY_CHANGE",
          id: "3:3",
          properties: ["x"],
          node: { type: "FRAME", removed: false }
        }
      ]);
      expect(scanAndSync).not.toHaveBeenCalled();
    });
  });

  it("coalesces many rapid relevant changes into exactly one scan", async () => {
    await fireAndFlush([
      { type: "PROPERTY_CHANGE", id: "1:1", properties: ["fills"] },
      { type: "PROPERTY_CHANGE", id: "1:1", properties: ["characters"] },
      { type: "PROPERTY_CHANGE", id: "1:4", properties: ["fontSize"] }
    ]);
    expect(scanAndSync).toHaveBeenCalledTimes(1);
    expect(scanAndSync).toHaveBeenCalledWith(new Set(["1:1", "1:4"]), "scan");
  });

  describe("while a node is being previewed by Adjust", () => {
    const FIGMA_MIXED = Symbol("figma.mixed");

    function textNode(id: string) {
      return { id, fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }] } as unknown as TextNode;
    }

    beforeEach(() => {
      // previewState holds module level state, reset it so each test starts empty
      vi.resetModules();
      vi.stubGlobal("figma", { on, mixed: FIGMA_MIXED });
    });

    it("skips a fill change on the previewed node, so a single passing click cannot be swept into a resolve", async () => {
      const { beginPreview } = await import("../adjust/adapter/previewState");
      await beginPreview([textNode("1:1")], { r: 1, g: 1, b: 1 });

      await fireAndFlush([{ type: "PROPERTY_CHANGE", id: "1:1", properties: ["fills"] }]);
      expect(scanAndSync).not.toHaveBeenCalled();
    });

    it("still scans an unrelated node while a different node is being previewed", async () => {
      const { beginPreview } = await import("../adjust/adapter/previewState");
      await beginPreview([textNode("1:1")], { r: 1, g: 1, b: 1 });

      await fireAndFlush([{ type: "PROPERTY_CHANGE", id: "1:9", properties: ["fills"] }]);
      expect(scanAndSync).toHaveBeenCalledWith(new Set(["1:9"]), "scan");
    });

    it("scans the node again once its preview is restored", async () => {
      const { beginPreview, restorePreview } = await import("../adjust/adapter/previewState");
      const node = textNode("1:1");
      await beginPreview([node], { r: 1, g: 1, b: 1 });
      await restorePreview();

      await fireAndFlush([{ type: "PROPERTY_CHANGE", id: "1:1", properties: ["fills"] }]);
      expect(scanAndSync).toHaveBeenCalledWith(new Set(["1:1"]), "scan");
    });

    it("scans apply's own write, since applyFill clears the tracked preview first", async () => {
      const { beginPreview, applyFill } = await import("../adjust/adapter/previewState");
      const node = textNode("1:1");
      await beginPreview([node], { r: 1, g: 1, b: 1 });
      await applyFill(node, [{ type: "SOLID", color: { r: 0, g: 0, b: 1 } }]);

      await fireAndFlush([{ type: "PROPERTY_CHANGE", id: "1:1", properties: ["fills"] }]);
      expect(scanAndSync).toHaveBeenCalledWith(new Set(["1:1"]), "scan");
    });

    it("skips a fill change on any of twelve previewed nodes, GROUPING_SPEC.md section 8", async () => {
      const { beginPreview } = await import("../adjust/adapter/previewState");
      const twelve = Array.from({ length: 12 }, (_, i) => textNode(`1:${i + 1}`));
      await beginPreview(twelve, { r: 1, g: 1, b: 1 });

      await fireAndFlush(
        twelve.map((node) => ({ type: "PROPERTY_CHANGE", id: node.id, properties: ["fills"] }))
      );
      expect(scanAndSync).not.toHaveBeenCalled();
    });

    it("scans all twelve again once the group preview is restored", async () => {
      const { beginPreview, restorePreview } = await import("../adjust/adapter/previewState");
      const twelve = Array.from({ length: 12 }, (_, i) => textNode(`1:${i + 1}`));
      await beginPreview(twelve, { r: 1, g: 1, b: 1 });
      await restorePreview();

      await fireAndFlush(
        twelve.map((node) => ({ type: "PROPERTY_CHANGE", id: node.id, properties: ["fills"] }))
      );
      expect(scanAndSync).toHaveBeenCalledWith(new Set(twelve.map((n) => n.id)), "scan");
    });
  });
});
