import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { contrastRule } from "../rules/contrast/contrastRule";

const rgb = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16) / 255,
  g: parseInt(hex.slice(3, 5), 16) / 255,
  b: parseInt(hex.slice(5, 7), 16) / 255
});
const solid = (hex: string) => [{ type: "SOLID", color: rgb(hex), visible: true, opacity: 1 }];

/** The layout from the review: a dark red rectangle behind black 12 px text, both on the page */
function reviewLayout() {
  const page = {
    id: "0:1",
    type: "PAGE",
    name: "Page 1",
    children: [] as unknown[],
    backgrounds: solid("#F5F5F5")
  };
  const rect = {
    id: "2:2",
    type: "RECTANGLE",
    name: "Background",
    visible: true,
    opacity: 1,
    blendMode: "NORMAL",
    fills: solid("#760606"),
    parent: page,
    absoluteBoundingBox: { x: 0, y: 0, width: 368, height: 321 }
  };
  const text = {
    id: "2:3",
    type: "TEXT",
    name: "Test",
    characters: "Test",
    fontSize: 12,
    fontWeight: 400,
    fontName: { family: "Inter", style: "Regular" },
    fills: solid("#000000"),
    opacity: 1,
    blendMode: "NORMAL",
    visible: true,
    parent: page,
    absoluteBoundingBox: { x: 100, y: 100, width: 30, height: 14 }
  };
  page.children.push(rect, text);
  return text as unknown as TextNode;
}

beforeEach(() => {
  vi.stubGlobal("figma", { mixed: Symbol("figma.mixed") });
});
afterEach(() => vi.unstubAllGlobals());

describe("snapshotTextNode with a shape behind the text", () => {
  it("measures against the shape, and flags what the page colour hid", async () => {
    const { snapshotTextNode } = await import("./snapshot");
    const snapshot = await snapshotTextNode(reviewLayout());
    expect(snapshot.background).toEqual(rgb("#760606"));
    expect(snapshot.backgroundSource).toEqual({
      kind: "node",
      nodeId: "2:2",
      nodeName: "Background"
    });
    const finding = contrastRule.evaluate(snapshot);
    expect(finding?.severity).toBe("high");
    expect(finding?.evidence.measuredRatio).toBeCloseTo(1.8, 1);
    expect(finding?.evidence.requiredRatio).toBe(4.5);
  });

  it("measures against the page when the option to count shapes is off, as it did before", async () => {
    const { snapshotTextNode } = await import("./snapshot");
    const snapshot = await snapshotTextNode(reviewLayout(), { shapesBehind: false });
    expect(snapshot.background).toEqual(rgb("#F5F5F5"));
    expect(snapshot.backgroundSource).toEqual({ kind: "page" });
    expect(contrastRule.evaluate(snapshot)).toBeNull();
  });

  it("is on by default", async () => {
    const { FEATURE_BACKDROP_SHAPES } = await import("../../../shared/detectionFlags");
    expect(FEATURE_BACKDROP_SHAPES).toBe(true);
  });
});
