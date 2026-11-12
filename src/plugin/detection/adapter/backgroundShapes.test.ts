import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NodeSnapshot } from "../../../shared/issues/issueTypes";
import { contrastRule } from "../rules/contrast/contrastRule";

const rgb = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16) / 255,
  g: parseInt(hex.slice(3, 5), 16) / 255,
  b: parseInt(hex.slice(5, 7), 16) / 255
});
const solid = (hex: string, extra: Record<string, unknown> = {}) => ({
  type: "SOLID",
  color: rgb(hex),
  visible: true,
  opacity: 1,
  ...extra
});

type Fake = Record<string, unknown>;

interface Layout {
  /** Fills of the shape behind the text, or null for no shape at all */
  shape?: Fake | null;
  shapeBox?: { x: number; y: number; width: number; height: number };
  /** The shape sits in a group and the text does not */
  inGroup?: boolean;
  frameFills?: unknown[];
}

const BOX = { x: 0, y: 0, width: 400, height: 300 };
const TEXT_BOX = { x: 100, y: 100, width: 40, height: 20 };

/** White text, a white frame, and by default a shape behind the text, so the shape decides the outcome */
function build(layout: Layout): TextNode {
  const page = {
    id: "0:1",
    type: "PAGE",
    name: "Page",
    children: [] as Fake[],
    backgrounds: [solid("#EEEEEE")]
  };
  const frame: Fake = {
    id: "1:1",
    type: "FRAME",
    name: "Frame",
    visible: true,
    opacity: 1,
    blendMode: "PASS_THROUGH",
    fills: layout.frameFills ?? [solid("#FFFFFF")],
    parent: page,
    absoluteBoundingBox: BOX,
    children: [] as Fake[]
  };
  const text: Fake = {
    id: "1:9",
    type: "TEXT",
    name: "Label",
    characters: "Label",
    fontSize: 16,
    fontWeight: 400,
    fontName: { family: "Inter", style: "Regular" },
    fills: [solid("#FFFFFF")],
    opacity: 1,
    blendMode: "NORMAL",
    visible: true,
    parent: frame,
    absoluteBoundingBox: TEXT_BOX
  };
  page.children.push(frame);
  if (layout.shape !== null) {
    const shape: Fake = {
      id: "1:5",
      type: "RECTANGLE",
      name: "Shape",
      visible: true,
      opacity: 1,
      blendMode: "NORMAL",
      effects: [],
      fills: [solid("#1A1A1A")],
      absoluteBoundingBox: layout.shapeBox ?? { x: 50, y: 50, width: 200, height: 150 },
      ...layout.shape
    };
    if (layout.inGroup) {
      const group: Fake = {
        id: "1:4",
        type: "GROUP",
        name: "Group",
        visible: true,
        opacity: 1,
        blendMode: "PASS_THROUGH",
        parent: frame,
        children: [shape],
        absoluteBoundingBox: BOX
      };
      shape.parent = group;
      (frame.children as Fake[]).push(group);
    } else {
      shape.parent = frame;
      (frame.children as Fake[]).push(shape);
    }
  }
  (frame.children as Fake[]).push(text);
  return text as unknown as TextNode;
}

beforeEach(() => vi.stubGlobal("figma", { mixed: Symbol("figma.mixed") }));
afterEach(() => vi.unstubAllGlobals());

async function snap(layout: Layout): Promise<NodeSnapshot> {
  const { snapshotTextNode } = await import("./snapshot");
  return snapshotTextNode(build(layout));
}

const measured = (snapshot: NodeSnapshot) => contrastRule.evaluate(snapshot);

/** What was measured against, or why nothing could be */
function outcome(snapshot: NodeSnapshot): "indeterminate" | "pass" | "fail" {
  if (snapshot.indeterminateReasons.length > 0) return "indeterminate";
  return measured(snapshot) === null ? "pass" : "fail";
}

describe("the shape chosen as the background", () => {
  it("1. an opaque solid shape that covers the text passes when the contrast is enough", async () => {
    const snapshot = await snap({});
    expect(snapshot.backgroundSource).toEqual({ kind: "node", nodeId: "1:5", nodeName: "Shape" });
    expect(snapshot.background).toEqual(rgb("#1A1A1A"));
    expect(outcome(snapshot)).toBe("pass");
  });

  it("2. a shape inside a group, with the text outside it, is ignored and the frame is measured", async () => {
    const snapshot = await snap({ inGroup: true });
    expect(snapshot.backgroundSource).toEqual({ kind: "node", nodeId: "1:1", nodeName: "Frame" });
    expect(outcome(snapshot)).toBe("fail");
    expect(measured(snapshot)?.evidence.measuredRatio).toBeCloseTo(1, 1);
  });

  it("3. a shape that does not cover the middle of the text is ignored and the frame is measured", async () => {
    const snapshot = await snap({ shapeBox: { x: 200, y: 200, width: 100, height: 80 } });
    expect(snapshot.backgroundSource).toEqual({ kind: "node", nodeId: "1:1", nodeName: "Frame" });
    expect(outcome(snapshot)).toBe("fail");
  });

  it("6. a shape with only a stroke is skipped and the frame is measured", async () => {
    const snapshot = await snap({
      shape: { fills: [], strokes: [solid("#1A1A1A")] }
    });
    expect(snapshot.backgroundSource).toEqual({ kind: "node", nodeId: "1:1", nodeName: "Frame" });
    expect(outcome(snapshot)).toBe("fail");
  });

  it("7. with no shape, a frame filled #1A1A1A passes", async () => {
    const snapshot = await snap({ shape: null, frameFills: [solid("#1A1A1A")] });
    expect(snapshot.backgroundSource).toEqual({ kind: "node", nodeId: "1:1", nodeName: "Frame" });
    expect(outcome(snapshot)).toBe("pass");
  });

  it("8. a hidden shape is skipped and the frame is measured", async () => {
    const snapshot = await snap({ shape: { visible: false } });
    expect(snapshot.backgroundSource).toEqual({ kind: "node", nodeId: "1:1", nodeName: "Frame" });
    expect(outcome(snapshot)).toBe("fail");
  });
});

/** Each of these is not a plain, fully opaque, normally blended color, so nothing may be measured from it */
const NOT_PLAIN: [string, Fake][] = [
  ["4. fill #1A1A1A at 50 percent opacity", { fills: [solid("#1A1A1A", { opacity: 0.5 })] }],
  [
    "5. a gradient fill from #808080 to #A1A1A1",
    {
      fills: [
        {
          type: "GRADIENT_LINEAR",
          visible: true,
          opacity: 1,
          gradientStops: [
            { position: 0, color: { ...rgb("#808080"), a: 1 } },
            { position: 1, color: { ...rgb("#A1A1A1"), a: 1 } }
          ]
        }
      ]
    }
  ],
  ["8. node opacity 50 percent", { opacity: 0.5 }],
  ["8. blend mode MULTIPLY", { blendMode: "MULTIPLY" }],
  ["8. an image fill", { fills: [{ type: "IMAGE", visible: true, opacity: 1, imageHash: "h" }] }],
  ["8. a video fill", { fills: [{ type: "VIDEO", visible: true, opacity: 1 }] }],
  ["8. two visible fills", { fills: [solid("#1A1A1A"), solid("#FFFFFF")] }],
  ["8. a background blur", { effects: [{ type: "BACKGROUND_BLUR", visible: true, radius: 10 }] }],
  ["8. a layer blur", { effects: [{ type: "LAYER_BLUR", visible: true, radius: 4 }] }],
  ["8. a fill with its own blend mode", { fills: [solid("#1A1A1A", { blendMode: "MULTIPLY" })] }]
];

describe("a shape that is not a plain opaque color", () => {
  it.each(NOT_PLAIN)(
    "%s is indeterminate and never a pass or a measured failure",
    async (_name, shape) => {
      const snapshot = await snap({ shape });
      expect(snapshot.indeterminateReasons.length).toBeGreaterThan(0);
      expect(snapshot.background).toBeNull();
      expect(snapshot.foreground).toBeNull();
      expect(outcome(snapshot)).toBe("indeterminate");
      expect(measured(snapshot)).toBeNull();
    }
  );

  it("does not look past the shape to guess the visible color", async () => {
    const snapshot = await snap({ shape: { fills: [solid("#1A1A1A", { opacity: 0.5 })] } });
    expect(snapshot.backgroundSource).toBeNull();
  });

  it("an invisible second fill does not count as a second fill", async () => {
    const snapshot = await snap({
      shape: { fills: [solid("#1A1A1A"), solid("#FFFFFF", { visible: false })] }
    });
    expect(outcome(snapshot)).toBe("pass");
  });

  it("a blur effect that is switched off does not count", async () => {
    const snapshot = await snap({
      shape: { effects: [{ type: "BACKGROUND_BLUR", visible: false, radius: 10 }] }
    });
    expect(outcome(snapshot)).toBe("pass");
  });

  it("a shadow is not a blur and does not stop the shape being measured", async () => {
    const snapshot = await snap({
      shape: { effects: [{ type: "DROP_SHADOW", visible: true, radius: 4 }] }
    });
    expect(outcome(snapshot)).toBe("pass");
  });
});

describe("the same rules for a frame as the background, with no shape", () => {
  it.each([
    ["a frame fill at 50 percent opacity", [solid("#1A1A1A", { opacity: 0.5 })]],
    ["a frame with a gradient", [{ type: "GRADIENT_LINEAR", visible: true, opacity: 1 }]],
    ["a frame with an image", [{ type: "IMAGE", visible: true, opacity: 1 }]],
    ["a frame with two visible fills", [solid("#1A1A1A"), solid("#FFFFFF")]]
  ])("%s is indeterminate", async (_name, frameFills) => {
    const snapshot = await snap({ shape: null, frameFills });
    expect(outcome(snapshot)).toBe("indeterminate");
    expect(snapshot.background).toBeNull();
  });
});
