import type { ChainLayer } from "../colorResolution";
import { isMarkerNodeId } from "../../markers/adapter/markerNodeRegistry";
import { extractNodeLayer, extractPageBackgroundLayer } from "./paintExtraction";

/** How many siblings below a layer are looked at, a crowded page is not walked end to end */
const MAX_SIBLINGS_LOOKED_AT = 60;
/** Types that are a surface a designer paints, a text, group or section behind is not a background */
const NOT_A_SURFACE = new Set(["TEXT", "GROUP", "SECTION", "LINE", "SLICE"]);

interface Point {
  x: number;
  y: number;
}

function centerOf(node: SceneNode): Point | null {
  const box = node.absoluteBoundingBox;
  return box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : null;
}

function covers(sibling: SceneNode, point: Point): boolean {
  const box = sibling.absoluteBoundingBox;
  return (
    box !== null &&
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}

function hasPaint(layer: ChainLayer): boolean {
  return layer.fill === "mixed" || layer.fill.kind !== "empty";
}

/**
 * The nearest shape painted behind this layer, in the same parent, that covers the centre of the text
 * Lower in the layer list means further back, and only one is needed since the first painted surface decides
 */
function shapeBehind(parent: ChildrenMixin, current: SceneNode, point: Point): ChainLayer | null {
  const children = parent.children;
  let looked = 0;
  for (let index = children.findIndex((c) => c.id === current.id) - 1; index >= 0; index -= 1) {
    const sibling = children[index];
    looked += 1;
    if (looked > MAX_SIBLINGS_LOOKED_AT) return null;
    if (
      sibling.visible === false ||
      NOT_A_SURFACE.has(sibling.type) ||
      isMarkerNodeId(sibling.id)
    ) {
      continue;
    }
    if (!("fills" in sibling) || !covers(sibling, point)) continue;
    const layer = extractNodeLayer(sibling);
    if (hasPaint(layer)) return layer;
  }
  return null;
}

/**
 * What is painted behind the text, nearest first: at each level the shape behind that layer, then the
 * container it sits in, ending with the page, and stopping at the first painted surface
 * Colour resolution only ever uses the first painted layer, so nothing past it is gathered
 */
export function buildBackdropChain(node: SceneNode): ChainLayer[] {
  const layers: ChainLayer[] = [];
  const point = centerOf(node);
  let current: SceneNode = node;

  while (current.parent) {
    const parent: BaseNode & ChildrenMixin = current.parent;
    const behind = point ? shapeBehind(parent, current, point) : null;
    if (behind) {
      layers.push(behind);
      return layers;
    }
    if (parent.type === "PAGE") {
      layers.push(extractPageBackgroundLayer(parent as PageNode));
      return layers;
    }
    const layer = extractNodeLayer(parent);
    layers.push(layer);
    if (hasPaint(layer)) return layers;
    current = parent as SceneNode;
  }
  return layers;
}
