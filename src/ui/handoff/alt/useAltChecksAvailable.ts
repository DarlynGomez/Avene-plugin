import { useContext } from "react";

import {
  altChecksAllowed,
  FEATURE_ALT_IN_STUDY,
  FEATURE_HANDOFF
} from "../../../shared/handoffFlags";
import { StudyStateContext } from "../../study/StudyStateContext";

/** The alt text checks show with handoff outside a session, and with the rest of the feedback inside one */
export function useAltChecksAvailable(): boolean {
  const state = useContext(StudyStateContext);
  return altChecksAllowed(FEATURE_HANDOFF, FEATURE_ALT_IN_STUDY, state?.session ?? null);
}
