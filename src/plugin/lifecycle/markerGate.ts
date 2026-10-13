import { FEATURE_MARKERS } from "../../shared/featureFlags";
import { isStudyActive, markersAllowed } from "../../shared/study/studyActive";
import { activeStudySession } from "../study/adapter/studySessionStore";

/** Markers are in play when the flag is on or a study session is running, so they can follow its phase */
export function markersInPlay(): boolean {
  return FEATURE_MARKERS || isStudyActive(activeStudySession());
}

/** Whether markers may show right now, resolved with the other study settings, see markersAllowed */
export function markersVisibleNow(): boolean {
  return markersAllowed(FEATURE_MARKERS, activeStudySession());
}
