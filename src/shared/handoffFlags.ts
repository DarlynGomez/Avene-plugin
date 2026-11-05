/** Handoff documents are off in every build but the demo branch, which turns it on in one commit */
export const FEATURE_HANDOFF = true;

/** The compile time flag only ever narrows, a study session switches handoff off */
export function handoffAllowed(flag: boolean, studyActive: boolean): boolean {
  return flag && !studyActive;
}

/** Writing an alt text to the canvas as an annotation is off until it has been checked in Figma */
export const FEATURE_ALT_ANNOTATIONS = false;

/** Narrows twice: the annotation flag, then everything handoff already needs, so a study switches it off */
export function annotationsAllowed(
  annotationFlag: boolean,
  handoffFlag: boolean,
  studyActive: boolean
): boolean {
  return annotationFlag && handoffAllowed(handoffFlag, studyActive);
}
