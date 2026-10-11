import { participantVisibility } from "../../shared/study/participantVisibility";
import { checkFreshFile } from "../../shared/study/freshFile";
import {
  endBlock,
  exitStudy,
  reveal,
  startBlock,
  type Clock,
  type TransitionResult
} from "../../shared/study/sessionTransitions";
import type {
  StudyMessage,
  StudyRefusal,
  StudyStateMessage
} from "../../shared/study/studyMessageTypes";
import type { StudySession } from "../../shared/study/studyTypes";
import type { PluginToUiMessage } from "../../shared/messageTypes";
import { STUDY_PROFILE_VERSION } from "../../shared/study/studyProfile";
import {
  buildBlockEnded,
  buildBlockStarted,
  buildFeedbackRevealed,
  buildIssueFirstDetected
} from "../../shared/study/studyEventBuilders";
import type { StudyEvent } from "../../shared/study/studyEvents";
import { loadRawIssues } from "../accountability/issueStore";
import { emitStudy } from "../study/adapter/studyEmitter";
import { gatherFreshFileInputs } from "../study/adapter/freshFileInputs";
import { loadStudySession, saveStudySession } from "../study/adapter/studySessionStore";

type Reply = (message: PluginToUiMessage) => void;

const systemClock: Clock = () => new Date().toISOString();

function stateMessage(
  session: StudySession | null,
  refusal: StudyRefusal | null
): StudyStateMessage {
  return { type: "STUDY_STATE", session, visibility: participantVisibility(session), refusal };
}

/** The current session and what the participant may see, always sent ahead of any issue list */
export function sendStudyState(reply: Reply): void {
  reply(stateMessage(loadStudySession(), null));
}

/** Saves an accepted transition, a refusal or a failed save changes nothing */
/** Saves an accepted transition and returns the new session, a refusal or failed save returns null */
function commit(
  result: TransitionResult,
  previous: StudySession | null,
  reply: Reply
): StudySession | null {
  if (!result.ok) {
    reply(stateMessage(previous, result.refusal));
    return null;
  }
  const saved = saveStudySession(result.session);
  if (!saved.saved) {
    const reason = saved.error ?? "The session could not be saved.";
    reply(stateMessage(previous, { code: "save-failed", reason }));
    return null;
  }
  reply(stateMessage(result.session, null));
  return result.session;
}

/** The first events of a block, the issues already in the file become its starting issues */
function emitBlockStarted(session: StudySession): void {
  const startingIssues = Object.values(loadRawIssues());
  emitStudy((ctx, seen) => {
    const events: StudyEvent[] = [buildBlockStarted(ctx, session.startedAt, STUDY_PROFILE_VERSION)];
    for (const issue of startingIssues) {
      const detected = buildIssueFirstDetected(
        ctx,
        session.startedAt,
        { id: issue.id, severity: issue.severityAtLastDetection },
        seen.detected,
        true
      );
      if (detected) events.push(detected);
    }
    return events;
  });
}

function emitBlockEnded(session: StudySession): void {
  const rows = Object.values(loadRawIssues()).map((issue) => ({
    id: issue.id,
    state: issue.state,
    severity: issue.severityAtLastDetection
  }));
  const at = session.endedAt ?? new Date().toISOString();
  emitStudy((ctx) => buildBlockEnded(ctx, at, rows));
}

function start(message: StudyMessage & { type: "STUDY_START_BLOCK" }, reply: Reply, clock: Clock) {
  const existing = loadStudySession();
  const result = startBlock(message, existing, clock);
  if (result.ok) {
    const fresh = checkFreshFile(gatherFreshFileInputs());
    if (!fresh.fresh) {
      reply(stateMessage(existing, { code: "not-fresh", reason: fresh.reason }));
      return;
    }
  }
  const started = commit(result, existing, reply);
  if (started) emitBlockStarted(started);
}

/** Handles the four inbound study messages through the pure transitions */
export function handleStudyMessage(
  message: StudyMessage,
  reply: Reply,
  clock: Clock = systemClock
): void {
  if (message.type === "STUDY_SUBSCRIBE") {
    sendStudyState(reply);
    return;
  }
  if (message.type === "STUDY_START_BLOCK") {
    start(message, reply, clock);
    return;
  }
  const session = loadStudySession();
  if (!session) {
    const reason = "There is no study session to change.";
    reply(stateMessage(null, { code: "no-session", reason }));
    return;
  }
  const transition =
    message.type === "STUDY_REVEAL"
      ? reveal
      : message.type === "STUDY_END_BLOCK"
        ? endBlock
        : exitStudy;
  const next = commit(transition(session, clock), session, reply);
  if (next && message.type === "STUDY_REVEAL") {
    const at = next.revealedAt ?? new Date().toISOString();
    emitStudy((ctx) => [buildFeedbackRevealed(ctx, at)]);
  }
  if (next && message.type === "STUDY_END_BLOCK") emitBlockEnded(next);
}
