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

/** Appends to what is already there, a designer's annotation is never replaced */
export function addMarkerAnnotation(
  node: AnnotatableNode,
  label: string,
  categoryId: string,
  tag: MarkerTag
): void {
  node.annotations = [...node.annotations, { label, categoryId }];
  node.setPluginData(MARKER_TAG_KEY, serializeTag(tag));
}

/**
 * Removes the CADT category annotations on a layer that carries the given tag, nothing else
 * Anything in another category, which is everything a designer wrote, survives
 */
export function removeMarkerAnnotations(
  node: AnnotatableNode,
  categoryId: string | null,
  matches: (tag: MarkerTag) => boolean
): boolean {
  const tag = parseTag(node.getPluginData(MARKER_TAG_KEY));
  if (!tag || !matches(tag)) {
    return false;
  }
  if (categoryId !== null) {
    node.annotations = node.annotations.filter(
      (annotation) => annotation.categoryId !== categoryId
    );
  }
  node.setPluginData(MARKER_TAG_KEY, "");
  return true;
}
