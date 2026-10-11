import { isStudyEvent } from "../../../shared/study/studyEventSchema";
import type { StudyEvent } from "../../../shared/study/studyEvents";
import { planAppend } from "../../../shared/study/studyLogChunks";
import type { StudySession } from "../../../shared/study/studyTypes";
import { resolveCalibration } from "../../storage/calibrationStore";
import { STORAGE_KEY_STUDY_LOG } from "../../storage/storageKeys";
import { activeStudySession } from "./studySessionStore";
import { META_KEY, countDrop, type AppendResult } from "./studyLogDrops";

export {
  getDropCounts,
  loadPersistedDropCounts,
  resetMemoryDropCounts,
  type AppendResult,
  type DropCounts,
  type DropReason
} from "./studyLogDrops";

const chunkKey = (index: number) => `${STORAGE_KEY_STUDY_LOG}.c${index}`;

export interface StudyLogDeps {
  getSession: () => StudySession | null;
  hasConsent: () => Promise<boolean>;
}

const defaultDeps: StudyLogDeps = {
  getSession: activeStudySession,
  hasConsent: async () => (await resolveCalibration())?.profile.loggingConsent === true
};

interface ChunkRead {
  events: StudyEvent[];
  intact: boolean;
}

function readChunk(index: number): ChunkRead {
  const raw = figma.root.getPluginData(chunkKey(index));
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.error(`studyLogStore: chunk ${index} was not a list, it was skipped`);
      return { events: [], intact: false };
    }
    const events = parsed.filter(isStudyEvent);
    if (events.length !== parsed.length) {
      console.error(
        `studyLogStore: chunk ${index} held ${parsed.length - events.length} invalid events`
      );
    }
    return { events, intact: events.length === parsed.length };
  } catch (error) {
    console.error(`studyLogStore: chunk ${index} was not valid JSON, it was skipped`, error);
    return { events: [], intact: false };
  }
}

/** Number of chunks written so far, a chunk is present while its key is not empty */
function chunkCount(): number {
  let count = 0;
  while (figma.root.getPluginData(chunkKey(count)) !== "") {
    count += 1;
  }
  return count;
}

/** Every valid event in order, anything unreadable is skipped, logged and left in the file */
export function loadStudyEvents(): StudyEvent[] {
  const events: StudyEvent[] = [];
  for (let index = 0, total = chunkCount(); index < total; index += 1) {
    events.push(...readChunk(index).events);
  }
  return events;
}

/**
 * Adds one event, only with an active session, consent, and an event that belongs to that session
 * Anything else is dropped and counted, never raised
 */
export async function appendStudyEvent(
  event: StudyEvent,
  deps: StudyLogDeps = defaultDeps
): Promise<AppendResult> {
  const session = deps.getSession();
  if (!session) {
    return countDrop("noSession", false);
  }
  if (!(await deps.hasConsent())) {
    return countDrop("noConsent", true);
  }
  const { ctx } = event;
  if (
    ctx.participantId !== session.participantId ||
    ctx.block !== session.block ||
    ctx.task !== session.task ||
    ctx.condition !== session.condition
  ) {
    return countDrop("contextMismatch", true);
  }

  const total = chunkCount();
  const last = total > 0 ? readChunk(total - 1) : { events: [], intact: true };
  // A damaged last chunk is never rewritten, the event goes into a fresh one after it
  const plan = planAppend(last.intact ? last.events : [], event);
  if (!plan.ok) {
    return countDrop("tooLarge", true);
  }
  const index = !last.intact || plan.target === "new" ? total : Math.max(total - 1, 0);
  try {
    figma.root.setPluginData(chunkKey(index), JSON.stringify(plan.events));
    return { written: true };
  } catch (error) {
    console.error("studyLogStore: figma.root.setPluginData failed", error);
    return countDrop("writeFailed", true);
  }
}

/** Empties every chunk and the counts, for the development reset only */
export function clearStudyLog(): void {
  for (let index = chunkCount() - 1; index >= 0; index -= 1) {
    figma.root.setPluginData(chunkKey(index), "");
  }
  figma.root.setPluginData(META_KEY, "");
}
