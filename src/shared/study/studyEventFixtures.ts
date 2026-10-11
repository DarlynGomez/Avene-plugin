import type { StudyEventContext } from "./studyEvents";
import type { StudySession } from "./studyTypes";

export const LIVE_CTX: StudyEventContext = {
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  phase: "designing"
};

export const POST_DESIGNING_CTX: StudyEventContext = {
  ...LIVE_CTX,
  condition: "post-task",
  phase: "designing"
};

export const POST_REVIEWING_CTX: StudyEventContext = { ...POST_DESIGNING_CTX, phase: "reviewing" };

export function sessionFor(ctx: StudyEventContext): StudySession {
  return {
    schemaVersion: 1,
    ...ctx,
    consentConfirmedAt: "2026-10-11T09:00:00.000Z",
    startedAt: "2026-10-11T09:00:00.000Z",
    revealedAt: null,
    endedAt: null,
    exports: [],
    exitedAt: null
  };
}

export const T = "2026-10-11T09:05:00.000Z";
