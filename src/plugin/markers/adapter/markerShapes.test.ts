import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CONTAINER_NAME,
  MARKER_POINTS,
  SEVERITY_COLORS,
  SHAPE_COLOR,
  SHAPE_COLOR_DEFERRED,
  shapeGeometry
} from "../../../shared/markers/markerShape";
import type { Marker } from "../../../shared/markers/markerSet";
import { isMarkerNodeId, forgetMarkerNodes } from "./markerNodeRegistry";
import { MARKER_TAG_KEY, parseTag } from "./markerTags";
import { createMarkerRenderer } from "./markerRenderer";
import { createFakeFigma, tag, type FakeNode } from "./markerFigmaStub";

const marker = (signature: string, screenId: string, nodeId: string): Marker => ({
  signature,
  screenId,
  issueId: `contrast:${nodeId}`,
  nodeId,
  label: "2.2"
});

const BOX = { x: 100, y: 200, width: 80, height: 20 };
const WHITE = { r: 1, g: 1, b: 1 };
const DESIGNER_NOTE: Annotation = { label: "Spacing is intentional here" };
let fake: ReturnType<typeof createFakeFigma>;

beforeEach(() => {
  forgetMarkerNodes();
  fake = createFakeFigma();
  fake.install();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const drawn = (): FakeNode[] =>
  [...fake.nodes.values()].filter((node) => parseTag(node.getPluginData(MARKER_TAG_KEY))?.kind);
const shapesOnCanvas = () => drawn().filter((node) => node.type === "POLYGON");
const containers = () => drawn().filter((node) => node.type === "FRAME");
const countsOnCanvas = () => drawn().filter((node) => node.type === "VECTOR");
/** The width of the path as written, read back from its data, since the stand in has no bounding box */
const countWidth = (node?: FakeNode): number => {
  const data = String((node?.vectorPaths as { data: string }[])[0]?.data);
  const xs = [...data.matchAll(/[ML](-?[\d.]+) /g)].map((match) => Number(match[1]));
  return Math.max(...xs) - Math.min(...xs);
};
const markerAnnotations = (node: FakeNode) => node.annotations.filter((a) => a.categoryId);

describe("the dot and the ring", () => {
  it("draws a dot inside one unlocked, unfilled frame at the top of the page, so it can be clicked", async () => {
    fake.addNode("1:1", [], "", BOX);
    await createMarkerRenderer("s1").show("A", [marker("r1", "A", "1:1")], "dot");

    const [frame] = containers();
    expect(containers()).toHaveLength(1);
    expect(frame?.name).toBe(CONTAINER_NAME);
    expect(frame?.locked).toBe(false);
    expect(shapesOnCanvas()[0]?.locked).toBe(false);
    expect(frame?.fills).toEqual([]);
    expect(frame?.parent).toBe(fake.page);
    const [shape] = shapesOnCanvas();
    expect(shape?.parent).toBe(frame);
    expect(shape?.fills).toEqual([{ type: "SOLID", color: SHAPE_COLOR }]);
    expect(shape?.strokes).toEqual([{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }]);
    expect(shape).toMatchObject({ width: 18, height: 18, strokeWeight: 1, strokeAlign: "INSIDE" });
  });

  it("draws a failing marker in the shape of its kind, in the warning red when its severity is not known, with a white outline", async () => {
    fake.addNode("1:1", [], "", BOX);
    await createMarkerRenderer("s1").show("A", [marker("r1", "A", "1:1")], "dot");

    const [shape] = shapesOnCanvas();
    expect(shape).toMatchObject({ pointCount: MARKER_POINTS.fail, width: 18, height: 18 });
    expect(shape?.fills).toEqual([{ type: "SOLID", color: SHAPE_COLOR }]);
    expect(shape?.strokes).toEqual([{ type: "SOLID", color: WHITE }]);
  });

  it("draws an important failing marker in the shape of its kind, with a white outline", async () => {
    fake.addNode("1:1", [], "", BOX);
    await createMarkerRenderer("s1").show(
      "A",
      [{ ...marker("r1", "A", "1:1"), important: true }],
      "dot"
    );

    const [shape] = shapesOnCanvas();
    expect(shape).toMatchObject({ pointCount: MARKER_POINTS.important, width: 18, height: 18 });
    expect(shape?.fills).toEqual([{ type: "SOLID", color: SHAPE_COLOR }]);
    expect(shape?.strokes).toEqual([{ type: "SOLID", color: WHITE }]);
  });

  it("draws the marker of a deferred root as a triangle in a muted gray, in the same place and size", async () => {
    fake.addNode("1:1", [], "", BOX);
    await createMarkerRenderer("s1").show(
      "A",
      [{ ...marker("r1", "A", "1:1"), deferred: true }],
      "dot"
    );

    const [shape] = shapesOnCanvas();
    const expected = shapeGeometry("dot", BOX, 1);
    expect(shape).toMatchObject({ x: expected.x, y: expected.y, width: 18, height: 18 });
    expect(shape).toMatchObject({ pointCount: MARKER_POINTS.deferred });
    expect(shape?.fills).toEqual([{ type: "SOLID", color: SHAPE_COLOR_DEFERRED }]);
    expect(shape?.strokes).toEqual([{ type: "SOLID", color: WHITE }]);
    expect(SHAPE_COLOR_DEFERRED.r).toBeCloseTo(SHAPE_COLOR_DEFERRED.g, 2);
    expect(SHAPE_COLOR_DEFERRED.r).toBeCloseTo(SHAPE_COLOR_DEFERRED.b, 2);
  });

  it("changes the same shape in place when its root is deferred, important or back to failing, without a new shape", async () => {
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")], "dot");
    expect(shapesOnCanvas()[0]).toMatchObject({ pointCount: MARKER_POINTS.fail });
    expect(shapesOnCanvas()[0]?.fills).toEqual([{ type: "SOLID", color: SHAPE_COLOR }]);

    await renderer.show("A", [{ ...marker("r1", "A", "1:1"), deferred: true }], "dot");
    expect(shapesOnCanvas()).toHaveLength(1);
    expect(shapesOnCanvas()[0]?.fills).toEqual([{ type: "SOLID", color: SHAPE_COLOR_DEFERRED }]);

    await renderer.show("A", [{ ...marker("r1", "A", "1:1"), important: true }], "dot");
    expect(shapesOnCanvas()).toHaveLength(1);
    expect(shapesOnCanvas()[0]).toMatchObject({ pointCount: MARKER_POINTS.important });
    expect(shapesOnCanvas()[0]?.fills).toEqual([{ type: "SOLID", color: SHAPE_COLOR }]);

    await renderer.show("A", [marker("r1", "A", "1:1")], "dot");
    expect(shapesOnCanvas()[0]).toMatchObject({ pointCount: MARKER_POINTS.fail });
  });

  it("draws a deferred ring with the muted gray on its stroke", async () => {
    fake.addNode("1:1", [], "", BOX);
    await createMarkerRenderer("s1").show(
      "A",
      [{ ...marker("r1", "A", "1:1"), deferred: true }],
      "ring"
    );
    expect(shapesOnCanvas()[0]?.strokes).toEqual([{ type: "SOLID", color: SHAPE_COLOR_DEFERRED }]);
  });

  it("sits just outside the top left corner of the layer, never over it", async () => {
    fake.addNode("1:1", [], "", BOX);
    await createMarkerRenderer("s1").show("A", [marker("r1", "A", "1:1")], "dot");

    const [shape] = shapesOnCanvas();
    const expected = shapeGeometry("dot", BOX, 1);
    expect(shape).toMatchObject({ x: expected.x, y: expected.y });
    expect((shape?.x ?? 0) + (shape?.width ?? 0)).toBeLessThanOrEqual(BOX.x);
    expect((shape?.y ?? 0) + (shape?.height ?? 0)).toBeLessThanOrEqual(BOX.y);
  });

  it("draws a ring the same size with no fill and a 2 unit stroke", async () => {
    fake.addNode("1:1", [], "", BOX);
    await createMarkerRenderer("s1").show("A", [marker("r1", "A", "1:1")], "ring");

    const [shape] = shapesOnCanvas();
    expect(shape).toMatchObject({ width: 18, height: 18, fills: [], strokeWeight: 2 });
    expect(shape?.strokes).toEqual([{ type: "SOLID", color: SHAPE_COLOR }]);
  });

  it("sizes the shape by the zoom it is written at", async () => {
    fake.state.zoom = 0.5;
    fake.addNode("1:1", [], "", BOX);
    await createMarkerRenderer("s1").show("A", [marker("r1", "A", "1:1")], "dot");

    expect(shapesOnCanvas()[0]).toMatchObject({ width: 36, strokeWeight: 2 });
  });

  it("tags the frame and every shape with the owner, the session and what they are", async () => {
    fake.addNode("1:1", [], "", BOX);
    await createMarkerRenderer("sess-3").show("A", [marker("r1", "A", "1:1")], "dot");

    expect(parseTag(containers()[0]?.getPluginData(MARKER_TAG_KEY) ?? "")).toEqual({
      userId: "u1",
      sessionId: "sess-3",
      kind: "container"
    });
    expect(parseTag(shapesOnCanvas()[0]?.getPluginData(MARKER_TAG_KEY) ?? "")).toEqual({
      userId: "u1",
      sessionId: "sess-3",
      kind: "shape",
      target: "1:1"
    });
  });

  it("is never inside a screen frame or an auto layout, whatever the target sits in", async () => {
    const screen = fake.addNode("F1", [], "", { x: 0, y: 0, width: 400, height: 400 });
    screen.type = "FRAME";
    const text = fake.addNode("1:1", [], "", BOX);
    screen.appendChild(text);
    fake.page.children.push(screen);
    await createMarkerRenderer("s1").show("A", [marker("r1", "A", "1:1")], "dot");

    expect(containers()[0]?.parent).toBe(fake.page);
    expect(screen.children.filter((child) => child.type === "FRAME")).toEqual([]);
    expect(screen.children).toEqual([text]);
  });

  it("registers every layer it draws so detection can skip them", async () => {
    fake.addNode("1:1", [], "", BOX);
    await createMarkerRenderer("s1").show("A", [marker("r1", "A", "1:1")], "ring");

    for (const node of drawn()) expect(isMarkerNodeId(node.id)).toBe(true);
  });

  it("draws nothing for a layer with no bounding box", async () => {
    fake.addNode("1:1");
    await createMarkerRenderer("s1").show("A", [marker("r1", "A", "1:1")], "dot");

    expect(drawn()).toEqual([]);
  });
});

describe("the color and the fade of a marker", () => {
  it.each(["low", "medium", "high"] as const)(
    "fills a failing marker by its %s severity",
    async (severity) => {
      fake.addNode("1:1", [], "", BOX);
      await createMarkerRenderer("s1").show(
        "A",
        [{ ...marker("r1", "A", "1:1"), severity }],
        "dot"
      );
      expect(shapesOnCanvas()[0]?.fills).toEqual([
        { type: "SOLID", color: SEVERITY_COLORS[severity] }
      ]);
      expect(shapesOnCanvas()[0]?.strokes).toEqual([
        { type: "SOLID", color: { r: 1, g: 1, b: 1 } }
      ]);
    }
  );

  it("repaints the same shape when the severity changes", async () => {
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [{ ...marker("r1", "A", "1:1"), severity: "low" }], "dot");
    await renderer.show("A", [{ ...marker("r1", "A", "1:1"), severity: "high" }], "dot");
    expect(shapesOnCanvas()).toHaveLength(1);
    expect(shapesOnCanvas()[0]?.fills).toEqual([{ type: "SOLID", color: SEVERITY_COLORS.high }]);
  });

  it("keeps a deferred marker gray whatever its severity, and fades only its fill, never the white outline", async () => {
    fake.addNode("1:1", [], "", BOX);
    await createMarkerRenderer("s1").show(
      "A",
      [{ ...marker("r1", "A", "1:1"), severity: "high", deferred: true, opacity: 0.5 }],
      "dot"
    );
    const [shape] = shapesOnCanvas();
    expect(shape?.fills).toEqual([{ type: "SOLID", color: SHAPE_COLOR_DEFERRED, opacity: 0.5 }]);
    expect(shape?.strokes).toEqual([{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }]);
  });

  it("fades the same shape further as the opacity falls, and writes nothing when it has not changed", async () => {
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    const deferred = (opacity?: number) => ({
      ...marker("r1", "A", "1:1"),
      deferred: true,
      ...(opacity === undefined ? {} : { opacity })
    });
    await renderer.show("A", [deferred()], "dot");
    expect(shapesOnCanvas()[0]?.fills).toEqual([{ type: "SOLID", color: SHAPE_COLOR_DEFERRED }]);
    await renderer.show("A", [deferred(0.7)], "dot");
    expect(shapesOnCanvas()).toHaveLength(1);
    expect(shapesOnCanvas()[0]?.fills).toEqual([
      { type: "SOLID", color: SHAPE_COLOR_DEFERRED, opacity: 0.7 }
    ]);
    fake.calls.length = 0;
    await renderer.show("A", [deferred(0.7)], "dot");
    expect(fake.calls).toEqual([]);
  });
});

describe("the number on the marker of a group", () => {
  const group = (nodeId: string, count?: number): Marker => ({
    ...marker("r1", "A", nodeId),
    ...(count === undefined ? {} : { count })
  });

  it("is a white stroke path in the middle of the shape, not a text layer, tagged as the marker's own", async () => {
    fake.addNode("1:1", [], "", BOX);
    await createMarkerRenderer("s1").show("A", [group("1:1", 3)], "dot");

    const [shape] = shapesOnCanvas();
    const [count] = countsOnCanvas();
    expect(countsOnCanvas()).toHaveLength(1);
    expect(fake.nodes.size).toBeGreaterThan(0);
    expect(
      [...fake.nodes.values()].some(
        (node) => node.type === "TEXT" && node.name === "Avene marker count"
      )
    ).toBe(false);
    expect(count?.parent).toBe(containers()[0]);
    expect(count?.fills).toEqual([]);
    expect(count?.strokes).toEqual([{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }]);
    expect(String((count?.vectorPaths as { data: string }[])[0]?.data)).toMatch(/^M/);
    expect(parseTag(count?.getPluginData(MARKER_TAG_KEY) ?? "")).toMatchObject({
      kind: "shape",
      target: "1:1"
    });
    const shapeCenter = (shape?.x as number) + (shape?.width as number) / 2;
    const countCenter = (count?.x as number) + countWidth(count) / 2;
    expect(countCenter).toBeCloseTo(shapeCenter, 1);
  });

  it("is not drawn for a marker with no related issues", async () => {
    fake.addNode("1:1", [], "", BOX);
    await createMarkerRenderer("s1").show("A", [group("1:1")], "dot");
    expect(shapesOnCanvas()).toHaveLength(1);
    expect(countsOnCanvas()).toEqual([]);
  });

  it("changes in place when the count changes, goes when the group becomes one, and comes back", async () => {
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [group("1:1", 3)], "dot");
    const first = countsOnCanvas()[0];
    const pathOf = (node?: FakeNode) => (node?.vectorPaths as { data: string }[])[0]?.data;
    const three = pathOf(first);

    await renderer.show("A", [group("1:1", 4)], "dot");
    expect(countsOnCanvas()).toEqual([first]);
    expect(pathOf(first)).not.toBe(three);

    await renderer.show("A", [group("1:1")], "dot");
    expect(countsOnCanvas()).toEqual([]);
    expect(shapesOnCanvas()).toHaveLength(1);

    await renderer.show("A", [group("1:1", 2)], "dot");
    expect(countsOnCanvas()).toHaveLength(1);
  });

  it("writes nothing when nothing changed", async () => {
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [group("1:1", 3)], "dot");
    fake.calls.length = 0;
    await renderer.show("A", [group("1:1", 3)], "dot");
    expect(fake.calls).toEqual([]);
  });

  it("goes with its shape when the marker is removed, and when markers are cleared", async () => {
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [group("1:1", 3)], "dot");
    await renderer.show("A", [], "dot");
    expect(countsOnCanvas()).toEqual([]);
    expect(containers()).toEqual([]);

    await renderer.show("A", [group("1:1", 3)], "dot");
    renderer.clearSync();
    expect(countsOnCanvas()).toEqual([]);
  });

  it("follows the zoom with its shape", async () => {
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [group("1:1", 3)], "dot");
    const near = countWidth(countsOnCanvas()[0]);
    fake.state.zoom = 2;
    await renderer.show("A", [group("1:1", 3)], "dot");
    expect(countWidth(countsOnCanvas()[0])).toBeCloseTo(near / 2, 3);
  });
});

describe("moving and removing shapes", () => {
  it("moves the same shape when the layer moves, and writes nothing when nothing changed", async () => {
    const node = fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")], "dot");
    const shape = shapesOnCanvas()[0];
    fake.calls.length = 0;

    await renderer.show("A", [marker("r1", "A", "1:1")], "dot");
    expect(fake.calls).toEqual([]);

    node.absoluteBoundingBox = { ...BOX, x: 300 };
    await renderer.show("A", [marker("r1", "A", "1:1")], "dot");
    expect(shapesOnCanvas()).toEqual([shape]);
    expect(shape?.x).toBe(shapeGeometry("dot", { ...BOX, x: 300 }, 1).x);
  });

  it("puts a shape a designer dragged away back where it belongs", async () => {
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")], "dot");
    const shape = shapesOnCanvas()[0] as FakeNode;
    const home = shape.x;
    shape.x = 999;
    await renderer.show("A", [marker("r1", "A", "1:1")], "dot");

    expect(shape.x).toBe(home);
  });

  it("removes the shapes and the frame on a screen swap to a screen with no markers", async () => {
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")], "dot");
    await renderer.show("B", [], "dot");

    expect(drawn()).toEqual([]);
    expect(fake.page.children.filter((child) => child.type === "FRAME")).toEqual([]);
  });

  it("swaps one shape for another across screens", async () => {
    fake.addNode("1:1", [], "", BOX);
    fake.addNode("2:1", [], "", { x: 600, y: 0, width: 50, height: 20 });
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")], "ring");
    await renderer.show("B", [marker("r2", "B", "2:1")], "ring");

    expect(
      shapesOnCanvas().map((shape) => parseTag(shape.getPluginData(MARKER_TAG_KEY))?.target)
    ).toEqual(["2:1"]);
  });

  it("removes everything synchronously on close, from live references", async () => {
    fake.addNode("1:1", [], "", BOX);
    fake.addNode("1:2", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1"), marker("r2", "A", "1:2")], "dot");
    renderer.clearSync();

    expect(drawn()).toEqual([]);
  });
});

describe("switching style", () => {
  it("never leaves two styles on the canvas, whichever way it goes", async () => {
    fake.addNode("1:1", [DESIGNER_NOTE], "", BOX);
    const renderer = createMarkerRenderer("s1");
    const markers = [marker("r1", "A", "1:1")];
    const onCanvas = () => ({
      annotation: markerAnnotations(fake.nodes.get("1:1") as FakeNode).length,
      shapes: shapesOnCanvas().length
    });

    await renderer.show("A", markers, "annotation");
    expect(onCanvas()).toEqual({ annotation: 1, shapes: 0 });
    await renderer.show("A", markers, "dot");
    expect(onCanvas()).toEqual({ annotation: 0, shapes: 1 });
    await renderer.show("A", markers, "ring");
    expect(onCanvas()).toEqual({ annotation: 0, shapes: 1 });
    expect(shapesOnCanvas()[0]?.fills).toEqual([]);
    await renderer.show("A", markers, "annotation");
    expect(onCanvas()).toEqual({ annotation: 1, shapes: 0 });
    expect(containers()).toEqual([]);
  });

  it("is one undo step for the whole switch", async () => {
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")], "annotation");
    fake.commitUndo.mockClear();
    await renderer.show("A", [marker("r1", "A", "1:1")], "dot");

    expect(fake.commitUndo).toHaveBeenCalledTimes(1);
  });

  it("keeps a designer's annotation and a designer's own shape through a whole cycle", async () => {
    const node = fake.addNode("1:1", [DESIGNER_NOTE], "", BOX);
    const mine = fake.addNode("D:1", [], "", BOX);
    mine.type = "POLYGON";
    fake.page.children.push(mine);
    const renderer = createMarkerRenderer("s1");
    const markers = [marker("r1", "A", "1:1")];

    for (const style of ["annotation", "dot", "ring", "annotation"] as const) {
      await renderer.show("A", markers, style);
    }
    await renderer.show("B", [], "annotation");
    renderer.clearSync();

    expect(node.annotations).toEqual([DESIGNER_NOTE]);
    expect(fake.nodes.get("D:1")).toBe(mine);
    expect(mine.removed).toBe(false);
    expect(fake.page.children).toContain(mine);
  });
});

describe("undo and duplicates", () => {
  it("removes shapes and the frame an undo brought back, at close", async () => {
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")], "dot");
    const [shape] = shapesOnCanvas() as [FakeNode];
    const [frame] = containers() as [FakeNode];
    await renderer.show("A", [], "dot");
    expect(drawn()).toEqual([]);

    // The undo brings both back, with their tags
    fake.resurrect(frame);
    fake.resurrect(shape, frame);
    shape.parent = frame;
    expect(drawn()).toHaveLength(2);

    renderer.clearSync();
    expect(drawn()).toEqual([]);
  });

  it("removes them at the next launch's sweep as well", async () => {
    fake.addNode("1:1", [], "", BOX);
    const first = createMarkerRenderer("s1");
    await first.show("A", [marker("r1", "A", "1:1")], "ring");
    const [shape] = shapesOnCanvas() as [FakeNode];
    const [frame] = containers() as [FakeNode];
    await first.show("A", [], "ring");
    fake.resurrect(frame);
    fake.resurrect(shape, frame);

    const result = await createMarkerRenderer("s2").sweepOrphans();

    expect(drawn()).toEqual([]);
    expect(result.cleaned).toBeGreaterThan(0);
  });

  it("removes a copy of a shape a designer duplicated, because it carries our tag", async () => {
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")], "dot");
    const original = shapesOnCanvas()[0] as FakeNode;
    const copy = fake.addNode("copy:1", [], original.getPluginData(MARKER_TAG_KEY));
    copy.type = "POLYGON";
    fake.page.children.push(copy);

    await renderer.sweepOrphans();

    expect(copy.removed).toBe(true);
    expect(original.removed).toBe(false);
  });

  it("leaves a shape that has no tag of ours, and another user's, alone", async () => {
    const plain = fake.addNode("D:1");
    plain.type = "POLYGON";
    const theirs = fake.addNode("T:1", [], tag("u2", "x", { kind: "shape", target: "9:9" }));
    theirs.type = "POLYGON";
    await createMarkerRenderer("s1").sweepOrphans();

    expect(plain.removed).toBe(false);
    expect(theirs.removed).toBe(false);
  });

  it("finds a container by its place at the top of a page even when the tag search misses it", async () => {
    const stray = fake.addNode("S:1", [], tag("u1", "old", { kind: "container" }));
    stray.type = "FRAME";
    stray.name = CONTAINER_NAME;
    fake.page.children.push(stray);

    await createMarkerRenderer("s1").sweepOrphans();

    expect(stray.removed).toBe(true);
  });
});

describe("view only", () => {
  it("draws nothing and says so once", async () => {
    fake.state.readOnly = true;
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");

    const first = await renderer.show("A", [marker("r1", "A", "1:1")], "dot");
    const second = await renderer.show("A", [marker("r1", "A", "1:1")], "dot");

    expect(first).toMatchObject({
      written: false,
      reason: "read_only",
      notice: expect.any(String)
    });
    expect(second).toMatchObject({ written: false, notice: null });
    expect(drawn()).toEqual([]);
  });
});

describe("following the zoom", () => {
  const marker1 = marker("r1", "A", "1:1");

  it("resizes a shape for the new zoom and keeps it the same size on screen", async () => {
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker1], "dot");
    fake.state.zoom = 4;
    await renderer.show("A", [marker1], "dot");

    expect(shapesOnCanvas()[0]).toMatchObject({ width: 4.5, height: 4.5, strokeWeight: 0.25 });
    expect(shapesOnCanvas()).toHaveLength(1);
  });

  it("still sits just outside the corner at every zoom", async () => {
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    for (const zoom of [0.1, 0.5, 1, 3, 16]) {
      fake.state.zoom = zoom;
      await renderer.show("A", [marker1], "ring");
      const shape = shapesOnCanvas()[0] as FakeNode;

      expect(shape.x + shape.width).toBeLessThanOrEqual(BOX.x + 1e-4);
      expect(shape.y + shape.height).toBeLessThanOrEqual(BOX.y + 1e-4);
    }
  });

  it("makes no write at all when nothing changed, even at a zoom whose size is not exact", async () => {
    fake.addNode("1:1", [], "", BOX);
    fake.state.zoom = 0.37;
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker1], "dot");
    fake.calls.length = 0;

    await renderer.show("A", [marker1], "dot");
    await renderer.show("A", [marker1], "dot");

    expect(fake.calls).toEqual([]);
  });

  it("does not take a resize for a refusal, and leaves an undo step out when asked", async () => {
    fake.addNode("1:1", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker1], "dot");
    fake.commitUndo.mockClear();
    fake.state.zoom = 2;
    const result = await renderer.show("A", [marker1], "dot", false);

    expect(result).toEqual({ written: true });
    expect(fake.commitUndo).not.toHaveBeenCalled();
    expect(shapesOnCanvas()[0]?.width).toBe(9);
  });

  it("still commits an undo step for a write that is not a zoom", async () => {
    fake.addNode("1:1", [], "", BOX);
    fake.addNode("1:2", [], "", BOX);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker1], "dot");
    fake.commitUndo.mockClear();
    await renderer.show("A", [marker1, marker("r2", "A", "1:2")], "dot");

    expect(fake.commitUndo).toHaveBeenCalledTimes(1);
  });
});
