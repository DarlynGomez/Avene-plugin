import { contextFromSession } from "../../../shared/study/studyBlockEvents";
import type { StudyEvent, StudyEventContext } from "../../../shared/study/studyEvents";
import { firstSeenFromEvents } from "../../../shared/study/studyFirstSeen";
import type { StudySession } from "../../../shared/study/studyTypes";
import { appendStudyEvent, loadStudyEvents } from "./studyLogStore";
import { activeStudySession } from "./studySessionStore";

export interface SeenInBlock {
  detected: Set<string>;
  responded: Set<string>;
}

type Build = (ctx: StudyEventContext, seen: SeenInBlock) => StudyEvent[];

// One append at a time, so two events never read and rewrite the same chunk together
let queue: Promise<void> = Promise.resolve();
let seenKey = "";
let seen: SeenInBlock = { detected: new Set(), responded: new Set() };

function seenFor(session: StudySession): SeenInBlock {
  const key = `${session.participantId}|${session.block}|${session.task}|${session.startedAt}`;
  if (key !== seenKey) {
    // Rebuilt from the log, so a plugin restarted mid block does not repeat first events
    const fromLog = firstSeenFromEvents(loadStudyEvents());
    seen = { detected: new Set(fromLog.detected), responded: new Set(fromLog.responded) };
    seenKey = key;
  }
  return seen;
}

function remember(event: StudyEvent): void {
  if (event.type === "issue_first_detected") seen.detected.add(event.issueId);
  if (event.type === "issue_first_response") seen.responded.add(event.issueId);
}

/**
 * Queues events for the active study session, nothing at all happens outside one
 * The session is read now, the events are built and written in turn, and a failure never reaches the caller
 */
export function emitStudy(build: Build): void {
  const session = activeStudySession();
  if (!session) {
    return;
  }
  const ctx = contextFromSession(session);
  queue = queue.then(async () => {
    try {
      const known = seenFor(session);
      for (const event of build(ctx, known)) {
        const result = await appendStudyEvent(event);
        if (result.written) remember(event);
      }
    } catch (error) {
      console.error("emitStudy: an event could not be recorded", error);
    }
  });
}

/** Resolves once every queued event has been written or dropped */
export function flushStudyEvents(): Promise<void> {
  return queue;
}
