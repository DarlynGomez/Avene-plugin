import { activeStudySession } from "../../study/adapter/studySessionStore";
import { PRECOMPUTE_ROLES_COMMAND } from "./precompute";

export const PRECOMPUTE_OFF_IN_STUDY = "Precompute roles is off while a study session is active";

/**
 * The precompute run sends images of the file to the role server, so it never starts inside a session
 * Returns true when the command was refused, a short notice is shown and the plugin closes with nothing sent
 */
export function refusePrecomputeInStudy(command: string): boolean {
  if (command !== PRECOMPUTE_ROLES_COMMAND || activeStudySession() === null) return false;
  figma.notify(PRECOMPUTE_OFF_IN_STUDY, { error: true });
  figma.closePlugin();
  return true;
}
