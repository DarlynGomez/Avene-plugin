import type { ParticipantVisibility } from "./participantVisibility";
import type { TransitionRefusalCode } from "./sessionTransitions";
import type { StudySession } from "./studyTypes";

export type StudyRefusalCode = TransitionRefusalCode | "not-fresh" | "no-session" | "save-failed";

/** Why a researcher action changed nothing, shown to the researcher only */
export interface StudyRefusal {
  code: StudyRefusalCode;
  reason: string;
}

/** The session or none, and what the participant may see, sent before any issue list */
export interface StudyStateMessage {
  type: "STUDY_STATE";
  session: StudySession | null;
  visibility: ParticipantVisibility;
  refusal: StudyRefusal | null;
}

/** The start form as typed, checked again in the sandbox */
export interface StudyStartBlockMessage {
  type: "STUDY_START_BLOCK";
  participantId: string;
  block: number;
  task: string;
  condition: string;
  paperConsentSigned: boolean;
}

export interface StudyRevealMessage {
  type: "STUDY_REVEAL";
}

export interface StudyEndBlockMessage {
  type: "STUDY_END_BLOCK";
}

export interface StudyExitMessage {
  type: "STUDY_EXIT";
}

/** Every study message the researcher panel sends */
export type StudyMessage =
  StudyStartBlockMessage | StudyRevealMessage | StudyEndBlockMessage | StudyExitMessage;
