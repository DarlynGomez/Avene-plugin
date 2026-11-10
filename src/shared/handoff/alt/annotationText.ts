import { isMarkerLabel } from "../../markers/markerLabel";
import { textHash } from "../hash";
import type { NodeNote } from "../noteStorage";

/** The category the annotation goes in, never the one the markers use */
export const ALT_CATEGORY_LABEL = "Alt text";

/** What the annotation says for a picture that is there for looks only, kept here and not in the code that writes it */
export const DECORATIVE_ANNOTATION_TEXT = "Decorative image. Leave the alt text empty.";

/** The text the annotation holds for a note, null when there is nothing to say */
export function annotationTextOf(note: NodeNote | undefined): string | null {
  if (!note || note.category !== "alt") return null;
  if (note.decorative) return DECORATIVE_ANNOTATION_TEXT;
  const text = note.text.trim();
  return text === "" ? null : text;
}

/** Line endings and the edges are not part of what was said, so Figma changing them is not an edit */
export function normalizeLabel(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}

export function labelHash(text: string): string {
  return textHash(normalizeLabel(text));
}

/** A text a marker test could take for a marker label, so it is never written as an alt annotation */
export function isReservedAnnotationText(text: string): boolean {
  const label = normalizeLabel(text);
  return label === "" || label === "." || isMarkerLabel(label);
}
