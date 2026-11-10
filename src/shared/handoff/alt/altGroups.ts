import type { ImageGroup, ImageLayer } from "./altTypes";

/** Layers that share an image hash, in the order the first of each was found, none is dropped */
export function groupByImageHash(layers: readonly ImageLayer[]): ImageGroup[] {
  const groups = new Map<string, ImageLayer[]>();
  for (const layer of layers) {
    const list = groups.get(layer.imageHash);
    if (list) list.push(layer);
    else groups.set(layer.imageHash, [layer]);
  }
  return [...groups].map(([imageHash, list]) => ({ imageHash, layers: list }));
}
