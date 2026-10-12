import { participantVisibility } from "../../shared/study/participantVisibility";
import type { StudyRefusal, StudyStateMessage } from "../../shared/study/studyMessageTypes";
import type { StudySession } from "../../shared/study/studyTypes";

export function stateMessage(
  session: StudySession | null,
  refusal: StudyRefusal | null
): StudyStateMessage {
  return { type: "STUDY_STATE", session, visibility: participantVisibility(session), refusal };
}
