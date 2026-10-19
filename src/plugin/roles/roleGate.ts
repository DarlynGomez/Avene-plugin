import { participantVisibility } from "../../shared/study/participantVisibility";
import { activeStudySession } from "../study/adapter/studySessionStore";

export interface RoleGate {
  /** The participant may be shown a role question */
  allowed: boolean;
  /** The server may be asked, only inside a study session and only where the question is shown */
  liveAllowed: boolean;
}

/**
 * Outside a session nothing is restricted but the server is never called, a study session follows
 * the visibility table: live designing and post-task reviewing only, never post-task designing or after the end
 */
export function roleGate(): RoleGate {
  const session = activeStudySession();
  const allowed = participantVisibility(session).elementRoleQuestions;
  return { allowed, liveAllowed: session !== null && allowed };
}
