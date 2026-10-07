import { FEATURE_VARIABLE_SCOPE } from "../../shared/featureFlags";
import { isStudyActive, variableScopeAllowed } from "../../shared/study/studyActive";
import { loadStudySession } from "../study/adapter/studySessionStore";

/**
 * The one answer to whether variable scope is on, read for the options and for every refusal
 * Off while a study session is active, whatever the flag says, and off if the session cannot be read
 */
export function variableScopeEnabled(): boolean {
  if (!FEATURE_VARIABLE_SCOPE) {
    return false;
  }
  try {
    return variableScopeAllowed(FEATURE_VARIABLE_SCOPE, isStudyActive(loadStudySession()));
  } catch (error) {
    console.error("variableScopeEnabled: the study session could not be read", error);
    return false;
  }
}
