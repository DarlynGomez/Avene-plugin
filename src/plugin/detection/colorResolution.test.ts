import { describe, expect, it } from "vitest";

import type { BackgroundSource } from "../../shared/issues/issueTypes";
import { resolveColors, type ChainLayer, type PaintLayer } from "./colorResolution";

const WHITE = { r: 1, g: 1, b: 1 };
const BLACK = { r: 0, g: 0, b: 0 };
const NODE_SOURCE: BackgroundSource = { kind: "node", nodeId: "1:1", nodeName: "Layer" };
const PAGE_SOURCE: BackgroundSource = { kind: "page" };

function solidLayer(color = BLACK, overrides: Partial<ChainLayer> = {}): ChainLayer {
  const fill: PaintLayer = { kind: "solid", color, opacity: 1 };
  return {
    fill,
    nodeOpacity: 1,
    blendMode: "NORMAL",
    visible: true,
    source: NODE_SOURCE,
    ...overrides
  };
}

function emptyLayer(overrides: Partial<ChainLayer> = {}): ChainLayer {
  return {
    fill: { kind: "empty" },
    nodeOpacity: 1,
    blendMode: "NORMAL",
    visible: true,
    source: NODE_SOURCE,
    ...overrides
  };
}

describe("resolveColors", () => {
  it("resolves a solid text fill against an immediate solid ancestor", () => {
    const result = resolveColors([solidLayer(BLACK), solidLayer(WHITE, { source: PAGE_SOURCE })]);
    expect(result).toEqual({
      foreground: BLACK,
      foregroundAlpha: 1,
      background: WHITE,
      backgroundAlpha: 1,
      backgroundSource: PAGE_SOURCE,
      indeterminateReasons: []
    });
  });

  it("walks past unpainted ancestors to find the first solid fill", () => {
    const result = resolveColors([
      solidLayer(BLACK),
      emptyLayer(),
      emptyLayer(),
      solidLayer(WHITE)
    ]);
    expect(result.background).toEqual(WHITE);
    expect(result.indeterminateReasons).toEqual([]);
  });

  it("falls back to the page background when no ancestor has a fill", () => {
    const page = solidLayer(WHITE, { source: PAGE_SOURCE });
    const result = resolveColors([solidLayer(BLACK), emptyLayer(), page]);
    expect(result.background).toEqual(WHITE);
    expect(result.backgroundSource).toEqual(PAGE_SOURCE);
  });

  it("names the ancestor node that supplied the background, not the page", () => {
    const ancestor = solidLayer(WHITE, {
      source: { kind: "node", nodeId: "2:2", nodeName: "Card" }
    });
    const result = resolveColors([solidLayer(BLACK), ancestor]);
    expect(result.backgroundSource).toEqual({ kind: "node", nodeId: "2:2", nodeName: "Card" });
  });

  it("carries each resolved fill's own alpha separately from the other", () => {
    const foreground: PaintLayer = { kind: "solid", color: BLACK, opacity: 1 };
    const result = resolveColors([{ ...emptyLayer(), fill: foreground }, solidLayer(WHITE)]);
    expect(result.foregroundAlpha).toBe(1);
    expect(result.backgroundAlpha).toBe(1);
  });

  it("is indeterminate, with the reason named, when the background says it is not a plain color", () => {
    const result = resolveColors([
      solidLayer(BLACK),
      solidLayer(WHITE, { notPlain: ["multiple-visible-fills", "blur-effect"] })
    ]);
    expect(result.background).toBeNull();
    expect(result.foreground).toBeNull();
    expect(result.indeterminateReasons).toEqual(["multiple-visible-fills", "blur-effect"]);
  });

  it("holds an unpainted ancestor that is not plain to the same rule, since the walk consulted it", () => {
    const result = resolveColors([
      solidLayer(BLACK),
      emptyLayer({ notPlain: ["blur-effect"] }),
      solidLayer(WHITE, { source: PAGE_SOURCE })
    ]);
    expect(result.indeterminateReasons).toEqual(["blur-effect"]);
  });

  it("is indeterminate when the text fill is mixed", () => {
    const result = resolveColors([{ ...emptyLayer(), fill: "mixed" }, solidLayer(WHITE)]);
    expect(result.foreground).toBeNull();
    expect(result.foregroundAlpha).toBeNull();
    expect(result.background).toBeNull();
    expect(result.backgroundAlpha).toBeNull();
    expect(result.backgroundSource).toBeNull();
    expect(result.indeterminateReasons).toContain("fill-mixed");
  });

  it("is indeterminate when the text fill is a gradient, image, or video", () => {
    const result = resolveColors([
      { ...emptyLayer(), fill: { kind: "unresolvable" } },
      solidLayer(WHITE)
    ]);
    expect(result.indeterminateReasons).toContain("fill-unresolvable");
  });

  it("is indeterminate when an ancestor's fill blocks resolution with a gradient", () => {
    const result = resolveColors([
      solidLayer(BLACK),
      { ...emptyLayer(), fill: { kind: "unresolvable" } }
    ]);
    expect(result.indeterminateReasons).toContain("fill-unresolvable");
  });

  it("is indeterminate when the text node's own paint opacity is below 1", () => {
    const partial: PaintLayer = { kind: "solid", color: BLACK, opacity: 0.5 };
    const result = resolveColors([{ ...emptyLayer(), fill: partial }, solidLayer(WHITE)]);
    expect(result.indeterminateReasons).toContain("opacity-below-one");
  });

  it("is indeterminate when an ancestor's node opacity is below 1", () => {
    const result = resolveColors([solidLayer(BLACK), solidLayer(WHITE, { nodeOpacity: 0.9 })]);
    expect(result.indeterminateReasons).toContain("opacity-below-one");
  });

  it("is indeterminate when a non-normal blend mode appears anywhere in the chain", () => {
    const result = resolveColors([solidLayer(BLACK, { blendMode: "MULTIPLY" }), solidLayer(WHITE)]);
    expect(result.indeterminateReasons).toContain("blend-mode");
  });

  it("does not treat PASS_THROUGH as a blend mode, since it is Figma's own default for an ordinary frame or group", () => {
    const result = resolveColors([
      solidLayer(BLACK),
      solidLayer(WHITE, { blendMode: "PASS_THROUGH" })
    ]);
    expect(result.indeterminateReasons).toEqual([]);
    expect(result.foreground).toEqual(BLACK);
    expect(result.background).toEqual(WHITE);
  });

  it("is indeterminate when the text node or an ancestor is invisible", () => {
    const result = resolveColors([solidLayer(BLACK), solidLayer(WHITE, { visible: false })]);
    expect(result.indeterminateReasons).toContain("node-invisible");
  });

  it("is indeterminate when no background resolves anywhere in the chain, including the page", () => {
    const result = resolveColors([solidLayer(BLACK), emptyLayer(), emptyLayer()]);
    expect(result.indeterminateReasons).toContain("no-background-resolved");
  });

  it("is indeterminate for a text node with no fill at all", () => {
    const result = resolveColors([emptyLayer(), solidLayer(WHITE)]);
    expect(result.indeterminateReasons).toContain("no-foreground-fill");
  });

  it("reports missing-node-data for an empty chain rather than throwing", () => {
    const result = resolveColors([]);
    expect(result).toEqual({
      foreground: null,
      foregroundAlpha: null,
      background: null,
      backgroundAlpha: null,
      backgroundSource: null,
      indeterminateReasons: ["missing-node-data"]
    });
  });
});
