import type { ChainLayer } from "../colorResolution";
import { extractBackgroundLayer, extractPageBackgroundLayer } from "./paintExtraction";

/**
 * Walks from the parent up to the page, ending with the page background as the last layer
 * Assumes the page is already loaded, startup guarantees it before any scan
 */
export function buildAncestorChain(node: SceneNode): ChainLayer[] {
  const layers: ChainLayer[] = [];
  let current: BaseNode | null = node.parent;

  while (current && current.type !== "PAGE") {
    layers.push(extractBackgroundLayer(current));
    current = current.parent;
  }

  if (current) {
    layers.push(extractPageBackgroundLayer(current));
  }

  return layers;
}
