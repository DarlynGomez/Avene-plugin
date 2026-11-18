import { isStudyActive } from "./study/studyActive";
import { participantVisibility } from "./study/participantVisibility";
import type { StudySession } from "./study/studyTypes";

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
 * Live alt text suggestions from the local server, on outside a session
 * A session switches handoff off, and these checks with it, so a participant does not see them
 * With it off the suggestions already saved in the file still work, and nothing is sent anywhere
 */
export const FEATURE_ALT_SUGGEST_LIVE = true;

/** The alt text checks also show to a participant, under the same rule as the rest of the feedback */
export const FEATURE_ALT_IN_STUDY = true;

/**
 * Whether the alt text checks may show: outside a session handoff decides, inside one the feedback does,
 * so live while designing, post-task only after reveal, and never once the block has ended
 */
export function altChecksAllowed(
  handoffFlag: boolean,
  inStudyFlag: boolean,
  session: StudySession | null
): boolean {
  if (!isStudyActive(session)) return handoffFlag;
  return inStudyFlag && participantVisibility(session).altChecks;
}

/** Live suggestions narrow the checks once more, nothing is asked where the checks are not shown */
export function altLiveAllowed(liveFlag: boolean, checksAllowed: boolean): boolean {
  return liveFlag && checksAllowed;
}
