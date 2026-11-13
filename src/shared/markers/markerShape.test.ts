import { describe, expect, it } from "vitest";

import { contrastRatio, relativeLuminance } from "../colour/contrastRatio";
import {
  DOT_STROKE,
  MARKER_POINTS,
  SHAPE_COLOR,
  SHAPE_COLOR_DEFERRED,
  markerLook,
  SHAPE_STROKE_WHITE,
  markerKind,
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
  it("is 18 canvas units at 100 percent, with a 1 unit stroke for a dot and 2 for a ring", () => {
    expect(shapeGeometry("dot", BOX, 1)).toMatchObject({ size: 18, strokeWeight: 1, filled: true });
    expect(shapeGeometry("ring", BOX, 1)).toMatchObject({
      size: 18,
      strokeWeight: 2,
      filled: false
    });
    expect([SHAPE_SIZE, DOT_STROKE, RING_STROKE]).toEqual([18, 1, 2]);
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
    expect(shapeGeometry("dot", BOX, 0.5).size).toBe(36);
    expect(shapeGeometry("dot", BOX, 2).size).toBe(9);
    expect(shapeGeometry("ring", BOX, 0.5).strokeWeight).toBe(4);
  });

  it("reads a zoom that cannot be right as 100 percent", () => {
    for (const zoom of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1000]) {
      expect(shapeGeometry("dot", BOX, zoom).size).toBe(18);
    }
  });

  it("follows the layer's corner wherever it is, including negative coordinates", () => {
    const shape = shapeGeometry("dot", { x: -500, y: -300, width: 10, height: 10 }, 1);

    expect(shape.x).toBe(-520);
    expect(shape.y).toBe(-320);
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

describe("the look of each marker", () => {
  const SEVERITIES = ["low", "medium", "high"] as const;
  const KINDS = ["fail", "important", "deferred"] as const;
  const everyLook = () =>
    KINDS.flatMap((kind) =>
      SEVERITIES.map((severity) => ({
        kind,
        severity,
        look: markerLook({
          ...(kind === "deferred" ? { deferred: true } : {}),
          ...(kind === "important" ? { important: true } : {}),
          severity
        })
      }))
    );
  const pair = (look: ReturnType<typeof markerLook>) =>
    `${look.points}|${Object.values(look.color).join(",")}`;

  it("has a shape for each kind, and the failing and important kinds differ in their corners", () => {
    expect(MARKER_POINTS.fail).not.toBe(MARKER_POINTS.important);
    expect(markerLook({ severity: "high" }).points).toBe(MARKER_POINTS.fail);
    expect(markerLook({ severity: "high", important: true }).points).toBe(MARKER_POINTS.important);
    expect(markerLook({ severity: "high", deferred: true }).points).toBe(MARKER_POINTS.deferred);
  });

  it("colors a failing marker by its severity, three different colors, and a deferred one gray whatever it was", () => {
    const failing = SEVERITIES.map((severity) => markerLook({ severity }).color);
    expect(new Set(failing.map((color) => Object.values(color).join(","))).size).toBe(3);
    const deferred = SEVERITIES.map((severity) => markerLook({ severity, deferred: true }).color);
    expect(new Set(deferred.map((color) => Object.values(color).join(","))).size).toBe(1);
    expect(deferred[0]).toEqual(SHAPE_COLOR_DEFERRED);
  });

  it("is darker as the severity gets worse, so the steps do not rest on hue alone", () => {
    const light = (severity: (typeof SEVERITIES)[number]) =>
      relativeLuminance(markerLook({ severity }).color);
    expect(light("high")).toBeLessThan(light("medium"));
    expect(light("medium")).toBeLessThan(light("low"));
  });

  it("falls back to the one warning color when the severity is not known", () => {
    expect(markerLook({}).color).toEqual(SHAPE_COLOR);
  });

  it("never gives two kinds of failing marker the same shape and color pair", () => {
    const pairs = everyLook().map(({ look }) => pair(look));
    expect(new Set(pairs).size).toBe(pairs.length - (SEVERITIES.length - 1));
  });

  it("keeps every fill readable against the white outline, which is what makes it work on any background", () => {
    for (const { kind, severity, look } of everyLook()) {
      expect(
        contrastRatio(look.color, SHAPE_STROKE_WHITE),
        `${kind} ${severity}`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("carries the fade as the fill opacity, solid when there is none", () => {
    expect(markerLook({ severity: "low" }).opacity).toBe(1);
    expect(markerLook({ severity: "low", deferred: true, opacity: 0.5 }).opacity).toBe(0.5);
  });

  it("is chosen by the root: deferred first, then important, otherwise failing", () => {
    expect(markerKind({})).toBe("fail");
    expect(markerKind({ important: true })).toBe("important");
    expect(markerKind({ deferred: true })).toBe("deferred");
    expect(markerKind({ deferred: true, important: true })).toBe("deferred");
  });
});
