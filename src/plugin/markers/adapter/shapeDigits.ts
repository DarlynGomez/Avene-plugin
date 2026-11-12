import { countText, digitPath, glyphScale } from "../../../shared/markers/markerDigits";
import { SHAPE_SIZE, SHAPE_STROKE_WHITE } from "../../../shared/markers/markerShape";
import { rememberMarkerNode } from "./markerNodeRegistry";
import { MARKER_TAG_KEY } from "./markerTags";
import { tagOf } from "./shapeLayers";

export interface DigitPlace {
  /** The shape's top left corner on the canvas and its size, which is already scaled for the zoom */
  x: number;
  y: number;
  size: number;
}

/**
 * The number on a marker of a group, drawn as a stroke path in the middle of its shape
 * It is a vector and not a text layer, so no scan of the file's text ever reads it and no font is needed
 * Tagged like the shape so a click on it counts as a click on the marker, and removed with it
 */
export function createDigitLayer(sessionId: string) {
  const digits = new Map<string, VectorNode>();
  const written = new Map<string, string>();

  function remove(nodeId: string): boolean {
    const digit = digits.get(nodeId);
    digits.delete(nodeId);
    written.delete(nodeId);
    if (!digit) return false;
    if (!digit.removed) digit.remove();
    return true;
  }

  /** Makes the number on one marker match its count, and returns whether the canvas was written to */
  function sync(
    frame: FrameNode,
    userId: string,
    nodeId: string,
    count: number | undefined,
    place: DigitPlace
  ): boolean {
    const text = countText(count);
    if (text === null) return remove(nodeId);
    const scale = (place.size / SHAPE_SIZE) * glyphScale([...text].length);
    const path = digitPath(text, scale);
    const x = place.x + place.size / 2 - path.width / 2 - frame.x;
    const y = place.y + place.size / 2 - path.height / 2 - frame.y;
    const key = [text, x, y, scale].map((part) => String(part)).join("|");
    let digit = digits.get(nodeId);
    if (digit && !digit.removed && written.get(nodeId) === key) return false;
    if (!digit || digit.removed) {
      digit = figma.createVector();
      digit.name = "Avene marker count";
      digit.setPluginData(MARKER_TAG_KEY, tagOf(userId, sessionId, "shape", nodeId));
      frame.appendChild(digit);
      rememberMarkerNode(digit.id);
      digits.set(nodeId, digit);
    }
    digit.vectorPaths = [{ windingRule: "NONE", data: path.data }];
    digit.fills = [];
    digit.strokes = [{ type: "SOLID", color: SHAPE_STROKE_WHITE }];
    digit.strokeWeight = path.strokeWeight * (place.size / SHAPE_SIZE);
    digit.strokeCap = "ROUND";
    digit.strokeJoin = "ROUND";
    digit.x = x;
    digit.y = y;
    written.set(nodeId, key);
    return true;
  }

  return {
    sync,
    remove,
    releaseAll(): void {
      for (const nodeId of [...digits.keys()]) remove(nodeId);
    },
    liveNodeIds: (): string[] => [...digits.values()].map((digit) => digit.id)
  };
}
