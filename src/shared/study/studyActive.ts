import type { StudySession } from "./studyTypes";

/** Study mode is on from Start block until the researcher exits, an ended block still counts */
export function isStudyActive(session: StudySession | null): session is StudySession {
  return session !== null && session.exitedAt === null;
}

/** The compile time flag only ever narrows, a study session switches variable scope off */
export function variableScopeAllowed(flag: boolean, studyActive: boolean): boolean {
  return flag && !studyActive;
}
