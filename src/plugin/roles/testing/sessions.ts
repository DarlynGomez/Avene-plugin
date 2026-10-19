import type { StudySession } from "../../../shared/study/studyTypes";

const BASE: StudySession = {
  schemaVersion: 1,
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  consentConfirmedAt: "t",
  phase: "designing",
  startedAt: "t",
  revealedAt: null,
  endedAt: null,
  exports: [],
  exitedAt: null
};

export const LIVE_DESIGNING: StudySession = BASE;
export const POST_DESIGNING: StudySession = { ...BASE, condition: "post-task" };
export const POST_REVIEWING: StudySession = {
  ...POST_DESIGNING,
  phase: "reviewing",
  revealedAt: "t"
};
export const ENDED: StudySession = { ...BASE, phase: "ended", endedAt: "t" };
