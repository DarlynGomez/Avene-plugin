import { validateStartForm, type StartFormInput } from "./participantIdSchema";
import { STUDY_SCHEMA_VERSION, type StudySession } from "./studyTypes";

/** Supplies the time as an ISO string, so transitions never read the system clock */
export type Clock = () => string;

export type TransitionRefusalCode =
  | "invalid-form"
  | "session-exists"
  | "exited"
  | "not-post-task"
  | "wrong-phase"
  | "review-required"
  | "already-ended";

export interface TransitionRefusal {
  code: TransitionRefusalCode;
  /** Shown to the researcher only */
  reason: string;
}

export type TransitionResult =
  { ok: true; session: StudySession } | { ok: false; refusal: TransitionRefusal };

function refuse(code: TransitionRefusalCode, reason: string): TransitionResult {
  return { ok: false, refusal: { code, reason } };
}

/** Any existing session blocks a start, including one that has exited */
export function startBlock(
  form: StartFormInput,
  existing: StudySession | null,
  clock: Clock
): TransitionResult {
  if (existing) {
    return refuse("session-exists", "This file already has a study session.");
  }
  const checked = validateStartForm(form);
  if (!checked.ok) {
    const first = Object.values(checked.errors)[0] ?? "The start form is not complete";
    return refuse("invalid-form", first);
  }
  const startedAt = clock();
  return {
    ok: true,
    session: {
      schemaVersion: STUDY_SCHEMA_VERSION,
      ...checked.value,
      consentConfirmedAt: startedAt,
      phase: "designing",
      startedAt,
      revealedAt: null,
      endedAt: null,
      exports: [],
      exitedAt: null
    }
  };
}

/** Post-task blocks only, designing to reviewing */
export function reveal(session: StudySession, clock: Clock): TransitionResult {
  if (session.exitedAt !== null) {
    return refuse("exited", "Study mode has been exited for this file.");
  }
  if (session.condition !== "post-task") {
    return refuse("not-post-task", "Feedback is already shown in the live condition.");
  }
  if (session.phase !== "designing") {
    return refuse(
      "wrong-phase",
      "Feedback can only be revealed while the participant is designing."
    );
  }
  return { ok: true, session: { ...session, phase: "reviewing", revealedAt: clock() } };
}

/** Live blocks end from designing, post-task blocks end from reviewing */
export function endBlock(session: StudySession, clock: Clock): TransitionResult {
  if (session.exitedAt !== null) {
    return refuse("exited", "Study mode has been exited for this file.");
  }
  if (session.phase === "ended") {
    return refuse("already-ended", "This block has already ended.");
  }
  const allowedPhase = session.condition === "live" ? "designing" : "reviewing";
  if (session.phase !== allowedPhase) {
    return session.condition === "post-task"
      ? refuse("review-required", "Reveal feedback first. A post-task block ends after the review.")
      : refuse("wrong-phase", "A live block ends while the participant is designing.");
  }
  return { ok: true, session: { ...session, phase: "ended", endedAt: clock() } };
}

/** Notes an export, allowed in any phase while study mode is on, nothing else changes */
export function recordExport(session: StudySession, clock: Clock): TransitionResult {
  if (session.exitedAt !== null) {
    return refuse("exited", "Study mode has been exited for this file.");
  }
  return { ok: true, session: { ...session, exports: [...session.exports, clock()] } };
}

/** Leaves study mode, allowed in any phase, and keeps every record */
export function exitStudy(session: StudySession, clock: Clock): TransitionResult {
  if (session.exitedAt !== null) {
    return refuse("exited", "Study mode has already been exited for this file.");
  }
  return { ok: true, session: { ...session, exitedAt: clock() } };
}
