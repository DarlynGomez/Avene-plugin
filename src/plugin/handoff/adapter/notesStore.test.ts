import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fits } from "../../../shared/handoff/limits";
import { serializeIndex, type NodeNote } from "../../../shared/handoff/noteStorage";
import { addCafeTexts, buildTree, type Tree } from "../../roles/testing/fakeFigma";
import { KEY_NODE_NOTES, KEY_NOTES_INDEX } from "../handoffKeys";
import { loadAllNotes, loadNotesIndex, setNodeNotes } from "./notesStore";

const AT = "2026-10-28T10:00:00.000Z";
const alt: NodeNote = { category: "alt", text: "A cafe sign", updatedAt: AT };
const name: NodeNote = { category: "name", text: "Open menu", updatedAt: AT };

let tree: Tree;
beforeEach(() => {
  tree = buildTree();
  addCafeTexts(tree);
});
afterEach(() => vi.unstubAllGlobals());

describe("notes store", () => {
  it("writes notes on the layer and the id in the index, and reads them back", async () => {
    expect(await setNodeNotes("t1", [alt, name])).toEqual({ saved: true });
    expect(await setNodeNotes("t2", [alt])).toEqual({ saved: true });
    expect(loadNotesIndex()).toEqual(["t1", "t2"]);
    expect(tree.nodes.get("t1")?.getPluginData).toBeDefined();
    expect(await loadAllNotes()).toEqual({ t1: [alt, name], t2: [alt] });
  });

  it("clears a layer and its index entry when the list is empty", async () => {
    await setNodeNotes("t1", [alt]);
    await setNodeNotes("t1", []);
    expect(loadNotesIndex()).toEqual([]);
    expect(await loadAllNotes()).toEqual({});
    const node = tree.nodes.get("t1") as unknown as { getPluginData: (k: string) => string };
    expect(node.getPluginData(KEY_NODE_NOTES)).toBe("");
  });

  it("prunes a layer that was deleted from the file on load", async () => {
    await setNodeNotes("t1", [alt]);
    await setNodeNotes("t2", [name]);
    tree.nodes.delete("t1");
    expect(await loadAllNotes()).toEqual({ t2: [name] });
    expect(loadNotesIndex()).toEqual(["t2"]);
  });

  it("prunes a layer flagged as removed and one whose notes were cleared outside", async () => {
    await setNodeNotes("t1", [alt]);
    await setNodeNotes("t2", [name]);
    (tree.nodes.get("t1") as Record<string, unknown>).removed = true;
    (
      tree.nodes.get("t2") as unknown as { setPluginData: (k: string, v: string) => void }
    ).setPluginData(KEY_NODE_NOTES, "");
    expect(await loadAllNotes()).toEqual({});
    expect(loadNotesIndex()).toEqual([]);
  });

  it("refuses a layer that is not in the file", async () => {
    const result = await setNodeNotes("nope", [alt]);
    expect(result.saved).toBe(false);
    expect(loadNotesIndex()).toEqual([]);
  });

  it("reports a write the platform refuses and leaves the index alone", async () => {
    const node = tree.nodes.get("t3") as unknown as { setPluginData: () => void };
    node.setPluginData = () => {
      throw new Error("cannot write to this node");
    };
    const result = await setNodeNotes("t3", [alt]);
    expect(result).toEqual({ saved: false, error: "cannot write to this node" });
    expect(loadNotesIndex()).toEqual([]);
  });

  it("refuses a layer when the index is full and leaves the layer and the index as they were", async () => {
    const ids = (count: number) =>
      Array.from({ length: count }, (_, i) => `${100 + (i % 900)}:${1000 + i}`);
    // the most ids that still fit, found by halving
    let low = 1;
    let high = 7000;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (fits(serializeIndex(ids(mid)))) low = mid;
      else high = mid - 1;
    }
    const full = low;
    const root = figma.root as unknown as { setPluginData: (k: string, v: string) => void };
    root.setPluginData(KEY_NOTES_INDEX, serializeIndex(ids(full)));
    // an instance child id is long, longer than the slack left in the full index
    const longId = "I1234567890:1234567890;1234567890:1234567890";
    tree.text(longId, "deep", "x", 10, 400);
    const result = await setNodeNotes(longId, [alt]);
    expect(result).toEqual({ saved: false, error: "Too many layers have notes" });
    expect(loadNotesIndex()).toHaveLength(full);
    const node = tree.nodes.get(longId) as unknown as { getPluginData: (k: string) => string };
    expect(node.getPluginData(KEY_NODE_NOTES)).toBe("");
  });
});
