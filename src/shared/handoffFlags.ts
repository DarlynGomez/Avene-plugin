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

/**
 * Live alt text suggestions from the local server stay off until the model gate has passed and the server is approved
 * With it off the suggestions already saved in the file still work, and nothing is sent anywhere
 */
export const FEATURE_ALT_SUGGEST_LIVE = false;

export function altLiveAllowed(
  liveFlag: boolean,
  handoffFlag: boolean,
  studyActive: boolean
): boolean {
  return liveFlag && handoffAllowed(handoffFlag, studyActive);
}
