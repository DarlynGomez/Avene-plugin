import { useContext } from "react";

import { FEATURE_MODULES, modulesAllowed } from "../../../shared/moduleFlags";
import { isStudyActive } from "../../../shared/study/studyActive";
import { StudyStateContext } from "../../study/StudyStateContext";

/** Lessons open from a finding only when the build has them on and no study session is running */
export function useModulesAvailable(): boolean {
  const state = useContext(StudyStateContext);
  return modulesAllowed(FEATURE_MODULES, isStudyActive(state?.session ?? null));
}
