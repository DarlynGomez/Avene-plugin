import { checkFreshFile } from "../../shared/study/freshFile";
import {
  endBlock,
  exitStudy,
  reveal,
  startBlock,
  type Clock,
  type TransitionResult
} from "../../shared/study/sessionTransitions";
import type { StudyMessage } from "../../shared/study/studyMessageTypes";
import type { StudySession } from "../../shared/study/studyTypes";
import type { PluginToUiMessage } from "../../shared/messageTypes";
import { buildFeedbackRevealed } from "../../shared/study/studyEventBuilders";
import { emitStudy } from "../study/adapter/studyEmitter";
import { markersOnBlockEnd, markersOnStudyChange } from "./markerRuntime";
import { emitBlockEnded, emitBlockStarted } from "./studyBlockEmit";
import { exportBlock } from "./studyExportProtocol";
import { stateMessage } from "./studyStateMessage";
import { gatherFreshFileInputs } from "../study/adapter/freshFileInputs";
import { loadStudySession, saveStudySession } from "../study/adapter/studySessionStore";

type Reply = (message: PluginToUiMessage) => void;

const systemClock: Clock = () => new Date().toISOString();

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
  markersOnStudyChange();
  return result.session;
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

/**
 * Ends the block, and every dot and the frame are gone before the panel is told it has ended
 * The session is saved first so the markers see the block as over, then they are removed, then the reply
 */
async function endAndClearMarkers(
  session: StudySession,
  reply: Reply,
  clock: Clock
): Promise<void> {
  const result = endBlock(session, clock);
  if (!result.ok) {
    reply(stateMessage(session, result.refusal));
    return;
  }
  const saved = saveStudySession(result.session);
  if (!saved.saved) {
    const reason = saved.error ?? "The session could not be saved.";
    reply(stateMessage(session, { code: "save-failed", reason }));
    return;
  }
  await markersOnBlockEnd();
  reply(stateMessage(result.session, null));
  emitBlockEnded(result.session);
}

/** Handles the inbound study messages through the pure transitions, only ending a block waits */
export async function handleStudyMessage(
  message: StudyMessage,
  reply: Reply,
  clock: Clock = systemClock
): Promise<void> {
  if (message.type === "STUDY_SUBSCRIBE") {
    sendStudyState(reply);
    return;
  }
  if (message.type === "STUDY_EXPORT") {
    exportBlock(reply, clock);
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
  if (message.type === "STUDY_END_BLOCK") {
    await endAndClearMarkers(session, reply, clock);
    return;
  }
  const transition = message.type === "STUDY_REVEAL" ? reveal : exitStudy;
  const next = commit(transition(session, clock), session, reply);
  if (next && message.type === "STUDY_REVEAL") {
    const at = next.revealedAt ?? new Date().toISOString();
    emitStudy((ctx) => [buildFeedbackRevealed(ctx, at)]);
  }
}
