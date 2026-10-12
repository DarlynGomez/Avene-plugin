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

/** The file for one block as text, the UI saves or copies it because only it can reach the disk */
export interface StudyExportReadyMessage {
  type: "STUDY_EXPORT_READY";
  fileName: string;
  text: string;
  eventCount: number;
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

/** Asks for the current state, answered with STUDY_STATE, so the UI never has to catch the startup push */
export interface StudySubscribeMessage {
  type: "STUDY_SUBSCRIBE";
}

/** Asks for the block's file, answered with STUDY_EXPORT_READY */
export interface StudyExportMessage {
  type: "STUDY_EXPORT";
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
  | StudySubscribeMessage
  | StudyStartBlockMessage
  | StudyRevealMessage
  | StudyEndBlockMessage
  | StudyExitMessage
  | StudyExportMessage;
