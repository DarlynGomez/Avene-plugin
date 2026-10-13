import { isFeedbackVisible } from "./studyBlockEvents";
import type { StudySession } from "./studyTypes";

/** Study mode is on from Start block until the researcher exits, an ended block still counts */
export function isStudyActive(session: StudySession | null): session is StudySession {
  return session !== null && session.exitedAt === null;
}

/** The compile time flag only ever narrows, a study session switches variable scope off */
export function variableScopeAllowed(flag: boolean, studyActive: boolean): boolean {
  return flag && !studyActive;
}

/**
 * Whether markers may show right now
 * While a session is active they follow what the participant may see, whatever the flag says:
 * shown in the live condition and after reveal, never in post-task designing or after the block ends
 * Outside a session the flag decides
 */
export function markersAllowed(flag: boolean, session: StudySession | null): boolean {
  return isStudyActive(session) ? isFeedbackVisible(session) : flag;
}
