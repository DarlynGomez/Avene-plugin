import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildTree, type Tree } from "../../roles/testing/fakeFigma";
import { listImageLayers } from "./imageInventory";

const IMAGE = (hash: string, extra: Record<string, unknown> = {}) => ({
  type: "IMAGE",
  imageHash: hash,
  ...extra
});

let tree: Tree;
beforeEach(() => {
  tree = buildTree();
});
afterEach(() => vi.unstubAllGlobals());

describe("image layer inventory", () => {
  it("lists a visible layer with an image fill, with its screen and size", () => {
    tree.frame("i1", "Hero", { fills: [IMAGE("h1")], width: 300, height: 120 });
    expect(listImageLayers()).toEqual([
      {
        nodeId: "i1",
        name: "Hero",
        screenId: "s1",
        screenName: "A1",
        width: 300,
        height: 120,
        imageHash: "h1"
      }
    ]);
  });

  it("leaves out gradients, solids, empty fills and a mixed fill", () => {
    tree.frame("g", "Gradient", { fills: [{ type: "GRADIENT_LINEAR" }] });
    tree.frame("s", "Solid", { fills: [{ type: "SOLID" }] });
    tree.frame("e", "Empty", { fills: [] });
    tree.text("t", "Label", "Hi", 14, 400, { fills: Symbol("mixed") });
    expect(listImageLayers()).toEqual([]);
  });

  it("leaves out a hidden layer, a layer under a hidden ancestor and a switched off image fill", () => {
    tree.frame("hidden", "Hidden", { fills: [IMAGE("h1")], visible: false });
    const parent = tree.frame("p", "Hidden parent", { visible: false });
    tree.frame("child", "Child", { fills: [IMAGE("h1")], parent });
    tree.frame("off", "Fill off", { fills: [IMAGE("h1", { visible: false })] });
    expect(listImageLayers()).toEqual([]);
  });

  it("finds a nested layer and names the outermost frame as its screen", () => {
    const card = tree.frame("card", "Card");
    tree.frame("photo", "Photo", { fills: [IMAGE("h2")], parent: card });
    const [layer] = listImageLayers();
    expect(layer).toMatchObject({ nodeId: "photo", screenId: "s1", screenName: "A1" });
  });

  it("keeps a layer that has a gradient and an image, and uses the image hash", () => {
    tree.frame("m", "Mixed", { fills: [{ type: "GRADIENT_LINEAR" }, IMAGE("h3")] });
    expect(listImageLayers().map((layer) => layer.imageHash)).toEqual(["h3"]);
  });

  it("gives layers with the same picture the same hash, so they can be grouped", () => {
    tree.frame("a", "Avatar", { fills: [IMAGE("same")] });
    tree.frame("b", "Avatar copy", { fills: [IMAGE("same")] });
    expect(new Set(listImageLayers().map((layer) => layer.imageHash)).size).toBe(1);
  });

  it("reads and writes nothing", () => {
    tree.frame("i1", "Hero", { fills: [IMAGE("h1")] });
    const sets = vi.fn();
    (figma.root as unknown as { setPluginData: unknown }).setPluginData = sets;
    listImageLayers();
    expect(sets).not.toHaveBeenCalled();
  });
});
