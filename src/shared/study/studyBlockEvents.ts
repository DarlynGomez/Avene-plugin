import type {
  BlockEndedEvent,
  BlockStartedEvent,
  FeedbackRevealedEvent,
  SnapshotRow,
  StudyEventContext
} from "./studyEvents";
import type { StudySession } from "./studyTypes";

export const MAX_SNAPSHOT_ROWS_PER_EVENT = 400;

export function contextFromSession(session: StudySession): StudyEventContext {
  const { participantId, block, task, condition, phase } = session;
  return { participantId, block, task, condition, phase };
}

/** Feedback is in front of the participant, the only time a response can happen */
export function isFeedbackVisible(ctx: Pick<StudyEventContext, "condition" | "phase">): boolean {
  return ctx.phase !== "ended" && (ctx.condition === "live" || ctx.phase === "reviewing");
}

export function buildBlockStarted(
  ctx: StudyEventContext,
  at: string,
  studyProfileVersion: number
): BlockStartedEvent {
  return { type: "block_started", at, ctx, studyProfileVersion };
}

export function buildFeedbackRevealed(ctx: StudyEventContext, at: string): FeedbackRevealedEvent {
  return { type: "feedback_revealed", at, ctx };
}

/** Always at least one part, so an empty file still records that the block ended */
export function buildBlockEnded(
  ctx: StudyEventContext,
  at: string,
  rows: readonly SnapshotRow[],
  maxRowsPerEvent = MAX_SNAPSHOT_ROWS_PER_EVENT
): BlockEndedEvent[] {
  const parts = Math.max(1, Math.ceil(rows.length / maxRowsPerEvent));
  return Array.from({ length: parts }, (_, index) => ({
    type: "block_ended" as const,
    at,
    ctx,
    part: { index, of: parts },
    issues: rows.slice(index * maxRowsPerEvent, (index + 1) * maxRowsPerEvent)
  }));
}
