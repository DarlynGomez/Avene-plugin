import { useContext } from "react";

import {
  FEATURE_ALT_ANNOTATIONS,
  FEATURE_HANDOFF,
  annotationsAllowed
} from "../../../shared/handoffFlags";
import { isStudyActive } from "../../../shared/study/studyActive";
import { StudyStateContext } from "../../study/StudyStateContext";

/** The annotation control exists only when its own flag and handoff are on and no study is running */
export function useAnnotationsAvailable(): boolean {
  const state = useContext(StudyStateContext);
  return annotationsAllowed(
    FEATURE_ALT_ANNOTATIONS,
    FEATURE_HANDOFF,
    isStudyActive(state?.session ?? null)
  );
}
