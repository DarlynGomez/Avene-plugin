import type { ObservedAnnotation } from "../../../shared/handoff/alt/annotationStatus";
import { labelHash } from "../../../shared/handoff/alt/annotationText";

export type AnnotatableNode = SceneNode & { annotations: ReadonlyArray<Annotation> };

/** Frames, components, instances, shapes and text have the property, groups and sections do not */
export function canAnnotate(node: BaseNode | null): node is AnnotatableNode {
  return node !== null && "annotations" in node && Array.isArray(node.annotations);
}

const labelOf = (annotation: Annotation): string =>
  annotation.label ?? annotation.labelMarkdown ?? "";

/**
 * The place of the annotation we wrote, found by our category and the hash of its text, never by words alone, or -1
 * Ours is appended last, so when the same words sit in the category twice the later one is taken
 */
export function findOurs(node: AnnotatableNode, categoryId: string, hash: string): number {
  for (let at = node.annotations.length - 1; at >= 0; at -= 1) {
    const annotation = node.annotations[at];
    if (annotation.categoryId === categoryId && labelHash(labelOf(annotation)) === hash) return at;
  }
  return -1;
}

/** What is on the layer, for the status; a category that does not exist yet means nothing of ours is there */
export function observe(
  node: BaseNode,
  categoryId: string | null,
  hash: string | undefined
): ObservedAnnotation {
  if (!canAnnotate(node)) return { supported: false, matched: false, inCategory: 0 };
  if (categoryId === null) return { supported: true, matched: false, inCategory: 0 };
  return {
    supported: true,
    matched: hash !== undefined && findOurs(node, categoryId, hash) >= 0,
    inCategory: node.annotations.filter((annotation) => annotation.categoryId === categoryId).length
  };
}

/** Appended after everything already there, which is passed through as it is */
export function appendAnnotation(node: AnnotatableNode, categoryId: string, text: string): void {
  node.annotations = [...node.annotations, { label: text, categoryId }];
}

/** Ours replaced in its own place, every other annotation is the same object it was */
export function replaceAnnotation(
  node: AnnotatableNode,
  index: number,
  categoryId: string,
  text: string
): void {
  node.annotations = node.annotations.map((annotation, at) =>
    at === index ? { label: text, categoryId } : annotation
  );
}

export function dropAnnotation(node: AnnotatableNode, index: number): void {
  node.annotations = node.annotations.filter((_annotation, at) => at !== index);
}
