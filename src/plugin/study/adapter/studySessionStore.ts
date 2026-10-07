import { isStudyActive } from "../../../shared/study/studyActive";
import { studySessionProblem } from "../../../shared/study/studySessionSchema";
import type { StudySession } from "../../../shared/study/studyTypes";
import { STORAGE_KEY_STUDY_SESSION } from "../../storage/storageKeys";

export interface StudySaveResult {
  saved: boolean;
  error?: string;
}

/** The stored text, empty when there is none, used to tell a missing session from an unreadable one */
export function readRawStudySession(): string {
  return figma.root.getPluginData(STORAGE_KEY_STUDY_SESSION);
}

/** Malformed data is discarded and the reason logged, nothing is erased from the file */
export function loadStudySession(): StudySession | null {
  const raw = readRawStudySession();
  if (!raw) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error("loadStudySession: stored session was not valid JSON", error);
    return null;
  }
  const problem = studySessionProblem(parsed);
  if (problem) {
    console.error(`loadStudySession: discarded the stored session, ${problem}`);
    return null;
  }
  return parsed as StudySession;
}

export function saveStudySession(session: StudySession): StudySaveResult {
  try {
    figma.root.setPluginData(STORAGE_KEY_STUDY_SESSION, JSON.stringify(session));
    return { saved: true };
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : String(error);
    console.error("saveStudySession: figma.root.setPluginData failed", error);
    return { saved: false, error: message };
  }
}

/** Not used by exit, which keeps the record, this exists for tooling and tests */
export function clearStudySession(): void {
  figma.root.setPluginData(STORAGE_KEY_STUDY_SESSION, "");
}

/** The session while study mode is on, null when there is none, it was exited, or it cannot be read */
export function activeStudySession(): StudySession | null {
  try {
    const session = loadStudySession();
    return isStudyActive(session) ? session : null;
  } catch (error) {
    console.error("activeStudySession: the session could not be read", error);
    return null;
  }
}
