import type { HandoffUiMessage } from "../../shared/handoff/handoffMessages";
import { altChecksAllowed, FEATURE_ALT_IN_STUDY, FEATURE_HANDOFF } from "../../shared/handoffFlags";
import { isStudyActive } from "../../shared/study/studyActive";
import { activeStudySession } from "../study/adapter/studySessionStore";

/** Every handoff message, only the alt text checks, or nothing */
export type HandoffAccess = "all" | "alt" | "none";

/** What the alt text checks send, the only handoff messages a study session ever answers */
export const ALT_CHECK_MESSAGES: ReadonlySet<string> = new Set([
  "HANDOFF_DATA_REQUEST",
  "HANDOFF_ALT_INVENTORY_REQUEST",
  "HANDOFF_ALT_SET",
  "HANDOFF_ALT_CROP_REQUEST",
  "HANDOFF_ALT_CACHE_REQUEST",
  "HANDOFF_ALT_CACHE_SET"
]);

/**
 * Outside a session the handoff flag decides, inside one only the alt text checks may answer, and only
 * while the participant may see feedback. The flags are read first so a build with both off reads nothing
 */
export function handoffAccess(): HandoffAccess {
  if (!FEATURE_HANDOFF && !FEATURE_ALT_IN_STUDY) return "none";
  const session = activeStudySession();
  if (!isStudyActive(session)) return FEATURE_HANDOFF ? "all" : "none";
  return altChecksAllowed(FEATURE_HANDOFF, FEATURE_ALT_IN_STUDY, session) ? "alt" : "none";
}

export function messageAllowed(access: HandoffAccess, message: HandoffUiMessage): boolean {
  return access === "all" || (access === "alt" && ALT_CHECK_MESSAGES.has(message.type));
}
