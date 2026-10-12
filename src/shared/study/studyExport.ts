import type { StudyEvent, SnapshotRow } from "./studyEvents";
import type { StudySession } from "./studyTypes";

export const STUDY_EXPORT_SCHEMA_VERSION = 1;

/** The Adjust log entries are stored by a plugin module and stay opaque here */
export type AdjustLogRecord = Record<string, unknown>;

export interface StudyExportInput {
  exportedAt: string;
  session: StudySession;
  events: readonly StudyEvent[];
  adjustLog: readonly AdjustLogRecord[];
  /** Drops counted while the session was active, so a gap in the log is visible */
  droppedWrites: Readonly<Record<string, number>>;
}

export interface StudyExportFile {
  schemaVersion: number;
  exportedAt: string;
  session: StudySession;
  events: readonly StudyEvent[];
  adjustLog: readonly AdjustLogRecord[];
  /** Every issue as the block ended, null while the block has not ended */
  finalSnapshot: readonly SnapshotRow[] | null;
  droppedWrites: Readonly<Record<string, number>>;
}

/** The file name carries who, which block and which task, safe because the id is validated */
export function exportFileName(session: StudySession): string {
  return `cadt-study-${session.participantId}-block${session.block}-task${session.task}.json`;
}

/** Reassembles the parts of block_ended into one list, null when the block has not ended */
export function finalSnapshotFromEvents(events: readonly StudyEvent[]): SnapshotRow[] | null {
  const parts = events.flatMap((event) => (event.type === "block_ended" ? [event] : []));
  if (parts.length === 0) {
    return null;
  }
  return [...parts].sort((a, b) => a.part.index - b.part.index).flatMap((part) => [...part.issues]);
}

export function buildStudyExport(input: StudyExportInput): StudyExportFile {
  return {
    schemaVersion: STUDY_EXPORT_SCHEMA_VERSION,
    exportedAt: input.exportedAt,
    session: input.session,
    events: input.events,
    adjustLog: input.adjustLog,
    finalSnapshot: finalSnapshotFromEvents(input.events),
    droppedWrites: input.droppedWrites
  };
}

/** An export taken after the block ended holds the final snapshot, one taken earlier does not count */
export function hasCurrentExport(session: StudySession): boolean {
  const endedAt = session.endedAt;
  return endedAt !== null && session.exports.some((time) => time >= endedAt);
}
