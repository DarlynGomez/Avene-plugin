import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildTree, type Tree } from "../../roles/testing/fakeFigma";
import { ALT_CROP_MAX_SIDE, cropScale, exportAltCrop } from "./altCrop";

let tree: Tree;
let sets: ReturnType<typeof vi.fn>;
const exported: { id: string; options: unknown }[] = [];

function layer(id: string, width: number, height: number, extra: Record<string, unknown> = {}) {
  return tree.frame(id, `Layer ${id}`, {
    width,
    height,
    exportAsync: (options: unknown) => {
      exported.push({ id, options });
      return Promise.resolve(new Uint8Array([137, 80, 78, 71]));
    },
    ...extra
  });
}

beforeEach(() => {
  tree = buildTree();
  exported.length = 0;
  sets = vi.fn();
  Object.assign(figma.root, { setPluginData: sets });
});
afterEach(() => vi.unstubAllGlobals());

describe("cropScale", () => {
  it("shrinks a big layer to the cap, grows a small one a little, and never past twice", () => {
    expect(cropScale(1536, 400)).toBe(0.5);
    expect(cropScale(ALT_CROP_MAX_SIDE, 10)).toBe(1);
    expect(cropScale(100, 80)).toBe(2);
    expect(cropScale(0, 0)).toBe(2);
  });
});

describe("exportAltCrop", () => {
  it("exports one layer as a PNG at that scale and sends it with the layer's own size", async () => {
    layer("i1", 1536, 400);
    const crop = await exportAltCrop("i1");
    expect(crop).toEqual({
      type: "HANDOFF_ALT_CROP",
      nodeId: "i1",
      ok: true,
      image: "iVBORw==",
      width: 1536,
      height: 400
    });
    expect(exported).toEqual([
      { id: "i1", options: { format: "PNG", constraint: { type: "SCALE", value: 0.5 } } }
    ]);
  });

  it("writes nothing to the file or the layer", async () => {
    const node = layer("i1", 100, 80);
    const own = vi.fn();
    Object.assign(node, { setPluginData: own, fills: [], annotations: [] });
    await exportAltCrop("i1");
    expect(sets).not.toHaveBeenCalled();
    expect(own).not.toHaveBeenCalled();
  });

  it("says a layer is gone, whether it is missing, removed or an id Figma cannot read", async () => {
    layer("i1", 100, 80, { removed: true });
    expect(await exportAltCrop("nope")).toMatchObject({ ok: false, reason: "layer-gone" });
    expect(await exportAltCrop("i1")).toMatchObject({ ok: false, reason: "layer-gone" });
    vi.spyOn(figma, "getNodeByIdAsync").mockRejectedValue(new Error("bad id"));
    expect(await exportAltCrop("1-1")).toMatchObject({ ok: false, reason: "layer-gone" });
  });

  it("gives a reason, and does not throw, when the layer cannot be exported or the export fails", async () => {
    tree.frame("plain", "Plain", { width: 10, height: 10 });
    layer("bad", 10, 10, {
      exportAsync: () => Promise.reject(new Error("too big"))
    });
    expect(await exportAltCrop("plain")).toMatchObject({ ok: false, reason: "export-failed" });
    expect(await exportAltCrop("bad")).toMatchObject({ ok: false, reason: "export-failed" });
  });
});
