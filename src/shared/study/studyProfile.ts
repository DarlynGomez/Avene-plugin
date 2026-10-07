import type { CalibrationAnswer, CalibrationProfile } from "../calibrationSchema";
import type { StudySession } from "./studyTypes";

export const STUDY_PROFILE_VERSION = 1;

/** Level 3 is Explain and suggest fixes, three Adjust options and no automatic preview */
export const STUDY_AI_ASSISTANCE_LEVEL = 3;

/**
 * Every enabled calibration answer, fixed for every participant
 * The two disabled questions are not asked in calibration and are not named here
 */
export const STUDY_ANSWERS: Readonly<Record<string, CalibrationAnswer>> = {
  projectType: "something-else",
  primaryAudience: "general-public",
  useEnvironments: [],
  otherTools: "none",
  accessibilityFamiliarity: "some-experience",
  explanationPreference: "explain-first",
  aiAssistanceLevel: STUDY_AI_ASSISTANCE_LEVEL
};

/**
 * The profile used while a session is active, in place of any stored calibration
 * Consent is on paper and the researcher confirmed it at block start, so logging is on
 */
export function buildStudyProfile(session: StudySession): CalibrationProfile {
  return {
    schemaVersion: STUDY_PROFILE_VERSION,
    completedAt: session.consentConfirmedAt,
    loggingConsent: true,
    answers: STUDY_ANSWERS
  };
}
