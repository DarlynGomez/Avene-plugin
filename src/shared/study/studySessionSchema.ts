import { participantIdError } from "./participantIdSchema";
import { STUDY_SCHEMA_VERSION, type StudySession } from "./studyTypes";

const PHASES = ["designing", "reviewing", "ended"];

function isIsoOrNull(value: unknown): boolean {
  return value === null || typeof value === "string";
}

/** Why a stored value is not a usable session, or null when it is one */
export function studySessionProblem(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "the stored session is not an object";
  }
  const s = value as Record<string, unknown>;

  if (s.schemaVersion !== STUDY_SCHEMA_VERSION) return "the schema version is not supported";
  if (participantIdError(s.participantId) !== null) return "the participant id is not valid";
  if (s.block !== 1 && s.block !== 2) return "the block is not 1 or 2";
  if (s.task !== "A" && s.task !== "B") return "the task is not A or B";
  if (s.condition !== "live" && s.condition !== "post-task") return "the condition is not known";
  if (typeof s.phase !== "string" || !PHASES.includes(s.phase)) return "the phase is not known";
  if (typeof s.consentConfirmedAt !== "string") return "the consent time is missing";
  if (typeof s.startedAt !== "string") return "the start time is missing";
  if (!isIsoOrNull(s.revealedAt) || !isIsoOrNull(s.endedAt) || !isIsoOrNull(s.exitedAt)) {
    return "a time field is neither a string nor null";
  }
  if (!Array.isArray(s.exports) || !s.exports.every((time) => typeof time === "string")) {
    return "the exports list is not a list of times";
  }

  if (s.condition === "live" && s.revealedAt !== null) return "a live block has a reveal time";
  if (s.phase === "reviewing" && (s.condition !== "post-task" || s.revealedAt === null)) {
    return "the reviewing phase needs a post-task block with a reveal time";
  }
  if ((s.phase === "ended") !== (s.endedAt !== null)) {
    return "the end time does not match the phase";
  }
  return null;
}

export function isStudySession(value: unknown): value is StudySession {
  return studySessionProblem(value) === null;
}
