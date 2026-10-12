import { isCadtMarker, type MarkerScope } from "./isCadtMarker";
import { MARKER_TAG_KEY, parseTag, serializeTag, type MarkerTag } from "./markerTags";

export type AnnotatableNode = SceneNode & { annotations: ReadonlyArray<Annotation> };

export function isAnnotatable(node: BaseNode | null): node is AnnotatableNode {
  return node !== null && "annotations" in node && "getPluginData" in node;
}

/** True when the layer carries a tag from someone else, so it is not ours to write on */
export function isTaggedByAnotherUser(node: AnnotatableNode, userId: string): boolean {
  const tag = parseTag(node.getPluginData(MARKER_TAG_KEY));
  return tag !== null && tag.userId !== userId;
}

/** The markers on a layer as they are on the canvas right now */
export function markersOn(node: AnnotatableNode, scope: MarkerScope): Annotation[] {
  return node.annotations.filter((annotation) => isCadtMarker(annotation, node, scope));
}

/**
 * Makes the layer carry exactly this one marker with no text, whatever is there now
 * An empty label is tried first, and a single dot is the fallback if Figma refuses it
 * Returns the label that was written so it can be recorded on the layer's tag
 * Everything that is not a marker, which is everything a designer wrote, is kept in place
 */
export function setMarker(
  node: AnnotatableNode,
  categoryId: string,
  tag: MarkerTag,
  scope: MarkerScope,
  preferredLabel: string
): string {
  const others = node.annotations.filter((annotation) => !isCadtMarker(annotation, node, scope));
  const write = (label: string) => {
    node.annotations = [...others, label === "" ? { categoryId } : { label, categoryId }];
    return label;
  };
  let written: string;
  try {
    written = write(preferredLabel);
  } catch (error) {
    if (preferredLabel !== "") throw error;
    written = write(".");
  }
  const next = serializeTag({ ...tag, label: written });
  if (node.getPluginData(MARKER_TAG_KEY) !== next) {
    node.setPluginData(MARKER_TAG_KEY, next);
  }
  return written;
}

/** Removes the markers and keeps the tag, which stays until close or the sweep */
export function removeMarkers(node: AnnotatableNode, scope: MarkerScope): boolean {
  const remaining = node.annotations.filter((annotation) => !isCadtMarker(annotation, node, scope));
  if (remaining.length === node.annotations.length) {
    return false;
  }
  node.annotations = remaining;
  return true;
}

/** The end of the layer's involvement, markers and tag together */
export function releaseNode(node: AnnotatableNode, scope: MarkerScope): void {
  removeMarkers(node, scope);
  if (parseTag(node.getPluginData(MARKER_TAG_KEY))?.userId === scope.userId) {
    node.setPluginData(MARKER_TAG_KEY, "");
  }
}
