import type { ParticipantVisibility } from "./participantVisibility";
import { studySessionProblem } from "./studySessionSchema";
import type { StudyMessage, StudyStateMessage } from "./studyMessageTypes";

const VISIBILITY_FLAGS: readonly (keyof ParticipantVisibility)[] = [
  "wordmark",
  "liveWatchLabel",
  "issueList",
  "headline",
  "counts",
  "filterAndGrouping",
  "ignoredTrayAndDecisions",
  "decisionOffers",
  "teachMeWhyTab",
  "calibrationAndConsent",
  "canvasMarkers",
  "adjustSheet",
  "ignoreSheet",
  "deferPinRestore",
  "showOnCanvas",
  "elementRoleQuestions"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Shape only, a wrong value in the form is refused with a reason, not dropped */
export function isStudyMessage(value: unknown): value is StudyMessage {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.type) {
    case "STUDY_SUBSCRIBE":
    case "STUDY_REVEAL":
    case "STUDY_END_BLOCK":
    case "STUDY_EXIT":
      return true;
    case "STUDY_START_BLOCK":
      return (
        typeof value.participantId === "string" &&
        typeof value.block === "number" &&
        typeof value.task === "string" &&
        typeof value.condition === "string" &&
        typeof value.paperConsentSigned === "boolean"
      );
    default:
      return false;
  }
}

export function isStudyStateMessage(value: unknown): value is StudyStateMessage {
  if (!isRecord(value) || value.type !== "STUDY_STATE") {
    return false;
  }
  const sessionOk = value.session === null || studySessionProblem(value.session) === null;
  const visibility = value.visibility;
  const visibilityOk =
    isRecord(visibility) &&
    VISIBILITY_FLAGS.every((flag) => typeof visibility[flag] === "boolean") &&
    (visibility.message === null || typeof visibility.message === "string");
  const refusal = value.refusal;
  const refusalOk =
    refusal === null ||
    (isRecord(refusal) && typeof refusal.code === "string" && typeof refusal.reason === "string");
  return sessionOk && visibilityOk && refusalOk;
}
