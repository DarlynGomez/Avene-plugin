import {
  CONTAINER_NAME,
  SHAPE_COLOR,
  SHAPE_STROKE_WHITE
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

export function paintShape(shape: EllipseNode, style: ShapeStyle, weight: number): void {
  const solid = (color: { r: number; g: number; b: number }): SolidPaint => ({
    type: "SOLID",
    color
  });
  if (style === "dot") {
    shape.fills = [solid(SHAPE_COLOR)];
    shape.strokes = [solid(SHAPE_STROKE_WHITE)];
  } else {
    shape.fills = [];
    shape.strokes = [solid(SHAPE_COLOR)];
  }
  shape.strokeWeight = weight;
  shape.strokeAlign = "INSIDE";
}
