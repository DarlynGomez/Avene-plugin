import {
  CONTAINER_NAME,
  SHAPE_STROKE_WHITE,
  nearlyEqual,
  type MarkerLook
} from "../../../shared/markers/markerShape";
import type { MarkerStyle } from "../../../shared/markers/markerStyle";
import { rememberMarkerNode } from "./markerNodeRegistry";
import { MARKER_TAG_KEY, serializeTag, type MarkerTag } from "./markerTags";

export type ShapeStyle = Exclude<MarkerStyle, "annotation">;

export function tagOf(
  userId: string,
  sessionId: string,
  kind: "shape" | "container",
  target?: string
): string {
  const tag: MarkerTag = { userId, sessionId, kind, ...(target ? { target } : {}) };
  return serializeTag(tag);
}

/** The frame is at the top level of the page, never inside a screen, with no fill and no layout */
export function makeContainer(userId: string, sessionId: string): FrameNode {
  const frame = figma.createFrame();
  frame.name = CONTAINER_NAME;
  frame.fills = [];
  frame.clipsContent = false;
  frame.layoutMode = "NONE";
  frame.resize(1, 1);
  frame.x = 0;
  frame.y = 0;
  frame.setPluginData(MARKER_TAG_KEY, tagOf(userId, sessionId, "container"));
  // Left unlocked, a locked frame makes everything in it impossible to click
  frame.locked = false;
  rememberMarkerNode(frame.id);
  return frame;
}

/** The outline is white for every kind, so the shape reads against a light or a dark background alike */
export function paintShape(
  shape: PolygonNode,
  style: ShapeStyle,
  weight: number,
  color: MarkerLook["color"]
): void {
  const solid = (paint: MarkerLook["color"]): SolidPaint => ({ type: "SOLID", color: paint });
  if (style === "dot") {
    shape.fills = [solid(color)];
    shape.strokes = [solid(SHAPE_STROKE_WHITE)];
  } else {
    shape.fills = [];
    shape.strokes = [solid(color)];
  }
  shape.strokeWeight = weight;
  shape.strokeAlign = "INSIDE";
}

/** Whether the shape already has the color its marker wants, so a layer that changed kind is painted again */
export function hasColor(
  shape: PolygonNode,
  style: ShapeStyle,
  want: MarkerLook["color"]
): boolean {
  const paints = (style === "dot" ? shape.fills : shape.strokes) as readonly Paint[];
  const paint = paints[0];
  if (!paint || paint.type !== "SOLID") return false;
  return (
    nearlyEqual(paint.color.r, want.r) &&
    nearlyEqual(paint.color.g, want.g) &&
    nearlyEqual(paint.color.b, want.b)
  );
}
