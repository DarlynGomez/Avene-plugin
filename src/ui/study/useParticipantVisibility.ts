import { useContext } from "react";

import {
  participantVisibility,
  type ParticipantVisibility
} from "../../shared/study/participantVisibility";
import { StudyStateContext } from "./StudyStateContext";

/** The one place the participant interface learns what it may show, unrestricted with no session */
export function useParticipantVisibility(): ParticipantVisibility {
  const state = useContext(StudyStateContext);
  return state?.visibility ?? participantVisibility(null);
}
