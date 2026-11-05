import type { AnnotationFailure } from "./annotationMessages";
import type { AnnotationStatus } from "./annotationStatus";

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** The line over the alt text list */
export function altLine(layers: number, screens: number): string {
  const subject = plural(layers, "image layer needs", "image layers need");
  return `${layers} ${subject} an alt text note across ${screens} ${plural(screens, "screen", "screens")}.`;
}

export const ALT_EMPTY_ALL_SET = "Every image layer has a note or is marked decorative. Nice work.";
export const ALT_EMPTY_NO_IMAGES = "No image layers on this page yet.";
export const ALT_LOADING = "Looking for image layers...";

/** How many roots and issues a check holds, for the check dropdown */
export function countLabel(roots: number, issues: number): string {
  return `${roots} ${plural(roots, "root", "roots")} • ${issues} ${plural(issues, "issue", "issues")}`;
}

export const ANNOTATION_STATUS_TEXT: Readonly<Record<AnnotationStatus, string>> = {
  none: "Not added",
  "in-sync": "Added",
  "out-of-date": "Out of date",
  missing: "Missing from the file",
  unsupported: "Not supported on this layer"
};

export const ANNOTATION_UNSUPPORTED_REASON = "This kind of layer cannot hold annotations.";

/** One plain line for an annotation that did not happen, never a code */
export function annotationFailureText(reason: AnnotationFailure, error?: string): string {
  switch (reason) {
    case "layer-gone":
      return "That layer is no longer in the file.";
    case "layer-type":
      return ANNOTATION_UNSUPPORTED_REASON;
    case "no-note":
      return "Save an alt text note first, then add the annotation.";
    case "reserved-text":
      return "That text looks like a marker number. Reword it a little to add it as an annotation.";
    case "already-annotated":
      return "This layer already has the annotation.";
    case "changed-on-canvas":
      return "That annotation was changed on the canvas, so Avene is leaving it alone. Edit or delete it there.";
    case "read-only":
      return error ? `Figma would not allow that: ${error}` : "Figma would not allow that here.";
    case "note-not-saved":
      return "The annotation could not be recorded, so nothing was added.";
  }
}
