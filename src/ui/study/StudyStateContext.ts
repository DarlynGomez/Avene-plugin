import { createContext } from "react";

import type { StudyStateMessage } from "../../shared/study/studyMessageTypes";

/** The latest STUDY_STATE, null until the sandbox has answered or when nothing provides it */
export const StudyStateContext = createContext<StudyStateMessage | null>(null);
