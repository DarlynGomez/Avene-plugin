export type StudyCondition = "live" | "post-task";
export type StudyPhase = "designing" | "reviewing" | "ended";
export type BlockNumber = 1 | 2;
export type TaskId = "A" | "B";

export const STUDY_SCHEMA_VERSION = 1;

/** One block of the study, stored in the task file, times are ISO strings stamped when the researcher acts */
export interface StudySession {
  schemaVersion: typeof STUDY_SCHEMA_VERSION;
  participantId: string;
  block: BlockNumber;
  task: TaskId;
  condition: StudyCondition;
  consentConfirmedAt: string;
  phase: StudyPhase;
  startedAt: string;
  /** Always null for the live condition */
  revealedAt: string | null;
  endedAt: string | null;
  exports: readonly string[];
  exitedAt: string | null;
}
