import { describe, expect, it } from "vitest";

import type { Headline } from "../../grouping/headline";
import type { NodeNote } from "../noteStorage";
import { ALT_MAX_CHARS } from "./altLimits";
import { ALT_EMPTY_ALL_SET, altLine, annotationFailureText, countLabel } from "./altCopy";
import {
  altCounts,
  altLayerViews,
  buildAltRoots,
  sectionAltRoots,
  sourceAfterEdit,
  targetLayer
} from "./altRoots";
import { combineHeadline } from "./combineHeadline";
import type { ImageLayer } from "./altTypes";

const AT = "2026-11-05T10:00:00.000Z";
const layer = (nodeId: string, hash: string, screen = "s1"): ImageLayer => ({
  nodeId,
  name: `Layer ${nodeId}`,
  screenId: screen,
  screenName: screen === "s1" ? "Home" : "Cart",
  width: 10,
  height: 10,
  imageHash: hash
});
const note = (text: string, over: Partial<NodeNote> = {}): NodeNote => ({
  category: "alt",
  text,
  updatedAt: AT,
  ...over
});

const views = altLayerViews([layer("1", "a"), layer("2", "b"), layer("3", "b", "s2")], {
  "1": [note("A hero", { source: "ai" })],
  "3": [note("", { decorative: true })]
});

describe("altLayerViews", () => {
  it("joins each layer to its note for status, text and source", () => {
    expect(views.map((v) => [v.nodeId, v.status, v.text, v.source])).toEqual([
      ["1", "answered", "A hero", "ai"],
      ["2", "unanswered", "", "designer"],
      ["3", "decorative", "", "designer"]
    ]);
  });
});

describe("roots and sections", () => {
  it("make one root of the layers that share a picture, those that need a note first", () => {
    const roots = buildAltRoots(views);
    expect(roots.map((r) => [r.imageHash, r.layers.length, r.unanswered])).toEqual([
      ["b", 2, 1],
      ["a", 1, 0]
    ]);
    expect(roots[0].screens.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("have one list by picture and a section for each screen by screen", () => {
    expect(sectionAltRoots(views, "root-cause").map((s) => s.label)).toEqual([""]);
    const sections = sectionAltRoots(views, "screen");
    expect(sections.map((s) => s.label)).toEqual(["Home", "Cart"]);
    expect(sections[0].roots.flatMap((r) => r.layers.map((l) => l.nodeId)).sort()).toEqual([
      "1",
      "2"
    ]);
  });

  it("act on the first layer with nothing recorded, else the first", () => {
    const [needs, done] = buildAltRoots(views);
    expect(targetLayer(needs).nodeId).toBe("2");
    expect(targetLayer(done).nodeId).toBe("1");
  });
});

describe("altCounts", () => {
  it("counts roots, layers and screens that still need a note, apart from the rest", () => {
    expect(altCounts(views)).toEqual({
      roots: 1,
      layers: 1,
      screens: 1,
      screenIds: ["s1"],
      answered: 1,
      decorative: 1
    });
  });
});

describe("combineHeadline", () => {
  const concentrated: Headline = {
    kind: "concentrated",
    bindings: [{ binding: "x", openCount: 3 }],
    totalOpenCount: 3
  };

  it("is the same headline when no image layer needs a note", () => {
    expect(combineHeadline(concentrated, new Set(["s1"]), { layers: 0, screenIds: [] })).toBe(
      concentrated
    );
  });

  it("adds the layers to the issues and joins the screens without counting one twice", () => {
    expect(
      combineHeadline(concentrated, new Set(["s1"]), { layers: 2, screenIds: ["s1", "s2"] })
    ).toEqual({
      kind: "unconcentrated",
      totalOpenCount: 5,
      screenCount: 2
    });
  });

  it("counts only the layers when nothing is open in contrast", () => {
    expect(
      combineHeadline({ kind: "nothingOpen", decidedRootCount: 2 }, new Set(), {
        layers: 1,
        screenIds: ["s2"]
      })
    ).toEqual({ kind: "unconcentrated", totalOpenCount: 1, screenCount: 1 });
  });
});

describe("sourceAfterEdit", () => {
  it("keeps the designer, keeps a suggestion that was not changed, and marks one that was", () => {
    expect(sourceAfterEdit("designer", "a", "b")).toBe("designer");
    expect(sourceAfterEdit("ai", "A sign", " A sign ")).toBe("ai");
    expect(sourceAfterEdit("ai", "A sign", "A new sign")).toBe("ai_edited");
    expect(sourceAfterEdit("ai_edited", "A sign", "A sign")).toBe("ai_edited");
  });
});

describe("copy", () => {
  it("reads the line in the singular and the plural", () => {
    expect(altLine(3, 2)).toBe("3 image layers need an alt text note across 2 screens.");
    expect(altLine(1, 1)).toBe("1 image layer needs an alt text note across 1 screen.");
    expect(countLabel(1, 1)).toBe("1 root • 1 issue");
    expect(countLabel(2, 0)).toBe("2 roots • 0 issues");
  });

  it("keeps the limit a named number and the empty state warm", () => {
    expect(ALT_MAX_CHARS).toBe(125);
    expect(ALT_EMPTY_ALL_SET).toMatch(/Nice work/);
  });

  it("gives every annotation failure a plain sentence with no code and no verdict word", () => {
    for (const reason of [
      "layer-gone",
      "layer-type",
      "no-note",
      "reserved-text",
      "already-annotated",
      "changed-on-canvas",
      "read-only",
      "note-not-saved"
    ] as const) {
      const text = annotationFailureText(reason);
      expect(text).toMatch(/\.$/);
      expect(text).not.toMatch(/failed|violation|[a-z]+-[a-z]+-/i);
    }
  });
});
