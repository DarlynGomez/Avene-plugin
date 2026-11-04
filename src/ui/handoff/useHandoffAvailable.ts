import { useContext } from "react";

import { FEATURE_HANDOFF, handoffAllowed } from "../../shared/handoffFlags";
import { isStudyActive } from "../../shared/study/studyActive";
import { StudyStateContext } from "../study/StudyStateContext";

/** Handoff is shown only when the build has it on and no study session is running */
export function useHandoffAvailable(): boolean {
  const state = useContext(StudyStateContext);
  return handoffAllowed(FEATURE_HANDOFF, isStudyActive(state?.session ?? null));
}
