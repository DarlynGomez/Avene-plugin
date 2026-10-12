import { MARKER_TAG_KEY, parseTag } from "./markerTags";

/**
 * The layer a dot or ring points at, when the node is one of this user's, otherwise null
 * Lets a click on the shape count as a click on the layer it marks
 */
export function shapeTargetOf(node: BaseNode, userId: string | null): string | null {
  if (userId === null || !("getPluginData" in node)) {
    return null;
  }
  const tag = parseTag(node.getPluginData(MARKER_TAG_KEY));
  return tag?.kind === "shape" && tag.userId === userId && tag.target ? tag.target : null;
}
