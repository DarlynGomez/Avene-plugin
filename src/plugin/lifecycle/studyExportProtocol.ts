import type { PluginToUiMessage } from "../../shared/messageTypes";
import { recordExport, type Clock } from "../../shared/study/sessionTransitions";
import { buildStudyExport, exportFileName } from "../../shared/study/studyExport";
import { loadAdjustLog } from "../adjust/adapter/adjustLogging";
import { loadPersistedDropCounts } from "../study/adapter/studyLogDrops";
import { loadStudyEvents } from "../study/adapter/studyLogStore";
import { loadStudySession, saveStudySession } from "../study/adapter/studySessionStore";
import { stateMessage } from "./studyStateMessage";

type Reply = (message: PluginToUiMessage) => void;

/**
 * Builds the file for the running block and notes the export on the session
 * The note is saved first, so the file lists its own export time, a failed save sends no file
 */
export function exportBlock(reply: Reply, clock: Clock): void {
  const session = loadStudySession();
  if (!session) {
    reply(
      stateMessage(null, { code: "no-session", reason: "There is no study session to export." })
    );
    return;
  }
  const noted = recordExport(session, clock);
  if (!noted.ok) {
    reply(stateMessage(session, noted.refusal));
    return;
  }
  const saved = saveStudySession(noted.session);
  if (!saved.saved) {
    const reason = saved.error ?? "The export could not be noted on the session.";
    reply(stateMessage(session, { code: "save-failed", reason }));
    return;
  }

  const events = loadStudyEvents();
  const file = buildStudyExport({
    exportedAt: noted.session.exports.at(-1) ?? clock(),
    session: noted.session,
    events,
    adjustLog: loadAdjustLog() as unknown as Record<string, unknown>[],
    droppedWrites: loadPersistedDropCounts()
  });
  reply({
    type: "STUDY_EXPORT_READY",
    fileName: exportFileName(noted.session),
    text: JSON.stringify(file, null, 2),
    eventCount: events.length
  });
  reply(stateMessage(noted.session, null));
}
