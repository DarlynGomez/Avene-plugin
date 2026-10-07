import { isStudyActive } from "./studyActive";
import type { StudySession } from "./studyTypes";

export const WAITING_MESSAGE = "Feedback will appear when you finish designing.";
export const ENDED_MESSAGE = "This task has ended.";

/** One flag per surface in the participant table, true means the participant may see it */
export interface ParticipantVisibility {
  wordmark: boolean;
  liveWatchLabel: boolean;
  issueList: boolean;
  headline: boolean;
  counts: boolean;
  filterAndGrouping: boolean;
  ignoredTrayAndDecisions: boolean;
  decisionOffers: boolean;
  teachMeWhyTab: boolean;
  calibrationAndConsent: boolean;
  canvasMarkers: boolean;
  adjustSheet: boolean;
  ignoreSheet: boolean;
  deferPinRestore: boolean;
  showOnCanvas: boolean;
  elementRoleQuestions: boolean;
  /** Replaces the headline when feedback is withheld or the block is over */
  message: string | null;
}

/** Things that are not built yet and so cannot be shown, passed in so the rule can be tested */
export interface VisibilityFeatures {
  teachMeWhyBuilt: boolean;
}

const NOT_BUILT: VisibilityFeatures = { teachMeWhyBuilt: false };

const UNRESTRICTED: ParticipantVisibility = {
  wordmark: true,
  liveWatchLabel: true,
  issueList: true,
  headline: true,
  counts: true,
  filterAndGrouping: true,
  ignoredTrayAndDecisions: true,
  decisionOffers: true,
  teachMeWhyTab: true,
  calibrationAndConsent: true,
  canvasMarkers: true,
  adjustSheet: true,
  ignoreSheet: true,
  deferPinRestore: true,
  showOnCanvas: true,
  elementRoleQuestions: true,
  message: null
};

/** No session, or one the researcher has exited, means normal and unrestricted behaviour */
export function participantVisibility(
  session: StudySession | null,
  features: VisibilityFeatures = NOT_BUILT
): ParticipantVisibility {
  if (!isStudyActive(session)) {
    return UNRESTRICTED;
  }

  const feedbackShown =
    session.phase !== "ended" && (session.condition === "live" || session.phase === "reviewing");

  return {
    wordmark: true,
    liveWatchLabel: feedbackShown,
    issueList: feedbackShown,
    headline: feedbackShown,
    counts: feedbackShown,
    filterAndGrouping: feedbackShown,
    ignoredTrayAndDecisions: feedbackShown,
    decisionOffers: feedbackShown,
    teachMeWhyTab: feedbackShown && features.teachMeWhyBuilt,
    calibrationAndConsent: false,
    canvasMarkers: feedbackShown,
    adjustSheet: feedbackShown,
    ignoreSheet: feedbackShown,
    deferPinRestore: feedbackShown,
    showOnCanvas: feedbackShown,
    elementRoleQuestions: feedbackShown,
    message: feedbackShown ? null : session.phase === "ended" ? ENDED_MESSAGE : WAITING_MESSAGE
  };
}
