import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forgetMarkerNodes, rememberMarkerNode } from "../../markers/adapter/markerNodeRegistry";
import { buildBackdropChain } from "./backdropChain";

const MIXED = Symbol("figma.mixed");
const rgb = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16) / 255,
  g: parseInt(hex.slice(3, 5), 16) / 255,
  b: parseInt(hex.slice(5, 7), 16) / 255
});
const solid = (hex: string) => [{ type: "SOLID", color: rgb(hex), visible: true, opacity: 1 }];

type Fake = Record<string, unknown> & { id: string; children?: Fake[] };
let counter = 0;

/** A layer with a box, placed in a parent at the next position up the layer list, so later ones are in front */
function layer(
  parent: Fake | null,
  type: string,
  name: string,
  extra: Record<string, unknown> = {}
): Fake {
  counter += 1;
  const node: Fake = {
    id: `n:${counter}`,
    type,
    name,
    visible: true,
    opacity: 1,
    blendMode: "NORMAL",
    absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
    parent,
    ...extra
  } as Fake;
  if (parent) parent.children?.push(node);
  return node;
}
const container = (
  parent: Fake | null,
  type: string,
  name: string,
  extra: Record<string, unknown> = {}
) => layer(parent, type, name, { children: [], ...extra });

/** The page, then a text in the middle of a 100 by 40 box, the way the layers panel lists them */
function page() {
  return {
    id: "0:1",
    type: "PAGE",
    name: "Page 1",
    children: [],
    backgrounds: solid("#F5F5F5")
  } as Fake;
}
const text = (parent: Fake) =>
  layer(parent, "TEXT", "Test", {
    absoluteBoundingBox: { x: 100, y: 100, width: 100, height: 40 },
    fills: solid("#000000")
  });
const chain = (node: Fake) => buildBackdropChain(node as unknown as SceneNode);
const names = (layers: ReturnType<typeof chain>) =>
  layers.map((l) => (l.source.kind === "page" ? "page" : l.source.nodeName));

beforeEach(() => {
  vi.stubGlobal("figma", { mixed: MIXED });
});
afterEach(() => {
  vi.unstubAllGlobals();
  forgetMarkerNodes();
});

describe("a shape behind the text", () => {
  it("is the background when both sit on the page, the case a reviewer hit", () => {
    const p = page();
    layer(p, "RECTANGLE", "Background", { fills: solid("#760606") });
    const t = text(p);
    const result = chain(t);
    expect(names(result)).toEqual(["Background"]);
    expect(result[0].fill).toEqual({ kind: "solid", color: rgb("#760606"), opacity: 1 });
  });

  it("beats the fill of the frame both of them are in", () => {
    const p = page();
    const frame = container(p, "FRAME", "Frame", { fills: solid("#FFFFFF") });
    layer(frame, "RECTANGLE", "Card", { fills: solid("#760606") });
    expect(names(chain(text(frame)))).toEqual(["Card"]);
  });

  it("is the nearest of several stacked shapes, the one just behind the text", () => {
    const p = page();
    layer(p, "RECTANGLE", "Bottom", { fills: solid("#111111") });
    layer(p, "RECTANGLE", "Top", { fills: solid("#760606") });
    expect(names(chain(text(p)))).toEqual(["Top"]);
  });

  it("is found behind a group the text is in, since the group does not paint", () => {
    const p = page();
    layer(p, "RECTANGLE", "Panel", { fills: solid("#760606") });
    const group = container(p, "GROUP", "Group");
    // The group is in the chain with no paint and is walked past, as it always was
    const result = chain(text(group));
    expect(names(result)).toEqual(["Group", "Panel"]);
    expect(result[0].fill).toEqual({ kind: "empty" });
  });

  it("is skipped for a shape in front of the text, which is not behind it", () => {
    const p = page();
    const t = text(p);
    layer(p, "RECTANGLE", "In front", { fills: solid("#760606") });
    expect(names(chain(t))).toEqual(["page"]);
  });

  it("is skipped when it does not cover the middle of the text", () => {
    const p = page();
    layer(p, "RECTANGLE", "Elsewhere", {
      fills: solid("#760606"),
      absoluteBoundingBox: { x: 300, y: 300, width: 50, height: 50 }
    });
    expect(names(chain(text(p)))).toEqual(["page"]);
  });

  it("counts a shape that just covers the middle, edges included", () => {
    const p = page();
    layer(p, "RECTANGLE", "Edge", {
      fills: solid("#760606"),
      absoluteBoundingBox: { x: 150, y: 120, width: 10, height: 10 }
    });
    expect(names(chain(text(p)))).toEqual(["Edge"]);
  });
});

describe("what is not a background", () => {
  it("skips a hidden shape, a shape with no fill and a shape with only a hidden fill, and uses the next one", () => {
    const p = page();
    layer(p, "RECTANGLE", "Real", { fills: solid("#760606") });
    layer(p, "RECTANGLE", "Hidden", { fills: solid("#00FF00"), visible: false });
    layer(p, "RECTANGLE", "Outline only", { fills: [] });
    layer(p, "RECTANGLE", "Hidden fill", {
      fills: [{ type: "SOLID", color: rgb("#0000FF"), visible: false }]
    });
    expect(names(chain(text(p)))).toEqual(["Real"]);
  });

  it("skips another text, a group, a section, a line, a node with no paint, and CADT's own markers", () => {
    const p = page();
    layer(p, "TEXT", "Other text", { fills: solid("#FF0000") });
    layer(p, "GROUP", "A group", { fills: solid("#FF0000") });
    layer(p, "SECTION", "A section", { fills: solid("#FF0000") });
    layer(p, "LINE", "A line", { fills: solid("#FF0000") });
    layer(p, "VECTOR", "No fills property");
    const marker = layer(p, "FRAME", "Avene markers (temporary)", { fills: solid("#FF0000") });
    rememberMarkerNode(marker.id);
    expect(names(chain(text(p)))).toEqual(["page"]);
  });

  it("skips a shape that has no box to test against", () => {
    const p = page();
    layer(p, "RECTANGLE", "No box", { fills: solid("#760606"), absoluteBoundingBox: null });
    expect(names(chain(text(p)))).toEqual(["page"]);
  });

  it("falls back to the containers when the text itself has no box", () => {
    const p = page();
    layer(p, "RECTANGLE", "Behind", { fills: solid("#760606") });
    const t = text(p);
    t.absoluteBoundingBox = null;
    expect(names(chain(t))).toEqual(["page"]);
  });

  it("only looks at 60 siblings, a crowded page is not walked end to end", () => {
    const p = page();
    layer(p, "RECTANGLE", "Too far back", { fills: solid("#760606") });
    for (let i = 0; i < 60; i += 1)
      layer(p, "RECTANGLE", `Away ${i}`, {
        fills: solid("#222222"),
        absoluteBoundingBox: { x: 900, y: 900, width: 1, height: 1 }
      });
    expect(names(chain(text(p)))).toEqual(["page"]);
  });
});

describe("the containers still work", () => {
  it("uses the inner frame when the text is inside it, a frame in a frame", () => {
    const p = page();
    const outer = container(p, "FRAME", "Outer", { fills: solid("#FFFFFF") });
    const inner = container(outer, "FRAME", "Inner", { fills: solid("#760606") });
    expect(names(chain(text(inner)))).toEqual(["Inner"]);
  });

  it("walks through frames with no fill to the first one that paints", () => {
    const p = page();
    const outer = container(p, "FRAME", "Painted", { fills: solid("#760606") });
    const inner = container(outer, "FRAME", "Clear", { fills: [] });
    expect(names(chain(text(inner)))).toEqual(["Clear", "Painted"]);
  });

  it("ends at the page when nothing paints", () => {
    const p = page();
    expect(names(chain(text(container(p, "FRAME", "Clear", { fills: [] }))))).toEqual([
      "Clear",
      "page"
    ]);
  });

  it("stops at the first painted surface and gathers nothing past it", () => {
    const p = page();
    layer(p, "RECTANGLE", "Deep", { fills: solid("#111111") });
    const frame = container(p, "FRAME", "Frame", { fills: solid("#760606") });
    expect(chain(text(frame))).toHaveLength(1);
  });

  it("keeps a gradient, image or mixed fill as the surface so the rule can say it cannot measure", () => {
    const p = page();
    layer(p, "RECTANGLE", "Photo", { fills: [{ type: "IMAGE", visible: true }] });
    expect(chain(text(p))[0].fill).toEqual({ kind: "unresolvable" });
  });
});
