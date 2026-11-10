import type { NodeNote } from "../noteStorage";
import { annotationTextOf, labelHash } from "./annotationText";

export type AnnotationStatus = "none" | "in-sync" | "out-of-date" | "missing" | "unsupported";

/** What was found on the layer, read by the adapter and handed over as plain data */
export interface ObservedAnnotation {
  /** False when the layer cannot hold annotations */
  supported: boolean;
  /** One in our category has the hash we stored, so it is the one we wrote */
  matched: boolean;
  /** How many annotations are in our category on the layer, whoever wrote them */
  inCategory: number;
}

/** Where a note and its annotation stand, an old note with no annotation fields is none */
export function annotationStatus(
  note: NodeNote | undefined,
  observed: ObservedAnnotation
): AnnotationStatus {
  if (!note || note.category !== "alt") return "none";
  if (!note.annotated || !note.annotatedHash) return observed.supported ? "none" : "unsupported";
  if (!observed.supported) return "unsupported";
  // An edit on the canvas changes the hash, so it can no longer be told from someone else's
  if (!observed.matched) return observed.inCategory > 0 ? "out-of-date" : "missing";
  const text = annotationTextOf(note);
  return text !== null && labelHash(text) === note.annotatedHash ? "in-sync" : "out-of-date";
}
