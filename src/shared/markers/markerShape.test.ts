import { describe, expect, it } from "vitest";

import { contrastRatio } from "../colour/contrastRatio";
import {
  DOT_STROKE,
  MARKER_LOOKS,
  SHAPE_STROKE_WHITE,
  markerKind,
  type MarkerKind,
  ZOOM_CHANGE_RATIO,
  ZOOM_POLL_MS,
  zoomChanged,
  RING_STROKE,
  SHAPE_GAP,
  SHAPE_SIZE,
  shapeGeometry,
  type TargetBox
} from "./markerShape";

const BOX: TargetBox = { x: 100, y: 200, width: 80, height: 20 };

describe("shapeGeometry", () => {
  it("is 12 canvas units at 100 percent, with a 2 unit stroke for a dot and 3 for a ring", () => {
    expect(shapeGeometry("dot", BOX, 1)).toMatchObject({ size: 12, strokeWeight: 2, filled: true });
    expect(shapeGeometry("ring", BOX, 1)).toMatchObject({
      size: 12,
      strokeWeight: 3,
      filled: false
    });
    expect([SHAPE_SIZE, DOT_STROKE, RING_STROKE]).toEqual([12, 2, 3]);
  });

  it("sits just outside the top left corner and never covers the layer", () => {
    for (const zoom of [0.05, 0.5, 1, 2, 16]) {
      for (const style of ["dot", "ring"] as const) {
        const shape = shapeGeometry(style, BOX, zoom);

        expect(shape.x + shape.size).toBeLessThanOrEqual(BOX.x);
        expect(shape.y + shape.size).toBeLessThanOrEqual(BOX.y);
      }
    }
  });

  it("leaves the gap between its corner and the layer's corner", () => {
    const shape = shapeGeometry("dot", BOX, 1);

    expect(BOX.x - (shape.x + shape.size)).toBe(SHAPE_GAP);
    expect(BOX.y - (shape.y + shape.size)).toBe(SHAPE_GAP);
  });

  it("is sized by the zoom it was written at, so it reads about the same on screen", () => {
    expect(shapeGeometry("dot", BOX, 0.5).size).toBe(24);
    expect(shapeGeometry("dot", BOX, 2).size).toBe(6);
    expect(shapeGeometry("ring", BOX, 0.5).strokeWeight).toBe(6);
  });

  it("reads a zoom that cannot be right as 100 percent", () => {
    for (const zoom of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1000]) {
      expect(shapeGeometry("dot", BOX, zoom).size).toBe(12);
    }
  });

  it("follows the layer's corner wherever it is, including negative coordinates", () => {
    const shape = shapeGeometry("dot", { x: -500, y: -300, width: 10, height: 10 }, 1);

    expect(shape.x).toBe(-514);
    expect(shape.y).toBe(-314);
  });
});

describe("zoomChanged", () => {
  it("is false for the same zoom and for a change too small to see", () => {
    expect(zoomChanged(1, 1)).toBe(false);
    expect(zoomChanged(1, 1 + ZOOM_CHANGE_RATIO / 2)).toBe(false);
    expect(zoomChanged(4, 4.04)).toBe(false);
  });

  it("is true once the zoom has moved by the ratio or more, in either direction", () => {
    expect(zoomChanged(1, 1.03)).toBe(true);
    expect(zoomChanged(1, 0.97)).toBe(true);
    expect(zoomChanged(0.05, 0.1)).toBe(true);
    expect(zoomChanged(50, 25)).toBe(true);
  });

  it("is judged by ratio, so it works the same at every zoom", () => {
    expect(zoomChanged(0.1, 0.103)).toBe(zoomChanged(100, 103));
  });

  it("is true when either value cannot be read, so the shapes get another look", () => {
    expect(zoomChanged(Number.NaN, 1)).toBe(true);
    expect(zoomChanged(1, Number.NaN)).toBe(true);
    expect(zoomChanged(0, 1)).toBe(true);
  });

  it("polls often enough to feel live and not so often it costs anything", () => {
    expect(ZOOM_POLL_MS).toBeGreaterThanOrEqual(80);
    expect(ZOOM_POLL_MS).toBeLessThanOrEqual(250);
  });
});

describe("the look of each kind of marker", () => {
  const KINDS = Object.keys(MARKER_LOOKS) as MarkerKind[];
  const pair = (kind: MarkerKind) =>
    `${MARKER_LOOKS[kind].points}|${Object.values(MARKER_LOOKS[kind].color).join(",")}`;

  it("is a triangle for a failing marker, a diamond for an important one, a gray triangle for a deferred one", () => {
    expect(MARKER_LOOKS.fail.points).toBe(3);
    expect(MARKER_LOOKS.important.points).toBe(4);
    expect(MARKER_LOOKS.deferred.points).toBe(3);
    expect(MARKER_LOOKS.fail.color).toEqual(MARKER_LOOKS.important.color);
    expect(MARKER_LOOKS.deferred.color).not.toEqual(MARKER_LOOKS.fail.color);
  });

  it("never gives two kinds the same shape and color pair", () => {
    expect(new Set(KINDS.map(pair)).size).toBe(KINDS.length);
  });

  it("lets the shape alone tell a failing marker from an important one, and the color alone only a deferred one", () => {
    expect(MARKER_LOOKS.fail.points).not.toBe(MARKER_LOOKS.important.points);
    expect(MARKER_LOOKS.fail.points).toBe(MARKER_LOOKS.deferred.points);
  });

  it("keeps every fill readable against the white outline, which is what makes it work on any background", () => {
    for (const kind of KINDS) {
      expect(
        contrastRatio(MARKER_LOOKS[kind].color, SHAPE_STROKE_WHITE),
        kind
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("is chosen by the root: deferred first, then important, otherwise failing", () => {
    expect(markerKind({})).toBe("fail");
    expect(markerKind({ important: true })).toBe("important");
    expect(markerKind({ deferred: true })).toBe("deferred");
    expect(markerKind({ deferred: true, important: true })).toBe("deferred");
  });
});
