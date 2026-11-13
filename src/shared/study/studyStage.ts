import { hasCurrentExport } from "./studyExport";
import type { StudySession } from "./studyTypes";

export type StageId = "block1" | "block2" | "postTask" | "exportDone" | "exited";
export type StageState = "done" | "now" | "next";

export interface Stage {
  id: StageId;
  label: string;
  state: StageState;
}

const LABELS: Record<StageId, string> = {
  block1: "Block 1",
  block2: "Block 2",
  postTask: "Post-task",
  exportDone: "Export done",
  exited: "Exited"
};
const ORDER: readonly StageId[] = ["block1", "block2", "postTask", "exportDone", "exited"];

/**
 * Where the study stands, read from the one session this file holds and nothing else
 * Each block has its own file, so a block 2 file implies block 1 is done, and a block 1 file leaves block 2 and
 * Post-task for the other file. Post-task here is the time after block 2 ends and before its export is taken
 * The first stage that is not done and belongs to this file is the one the researcher is on, and none is after exit
 */
export function studyStages(session: StudySession): Stage[] {
  const second = session.block === 2;
  const ended = session.phase === "ended";
  const exported = hasCurrentExport(session);
  const done: Record<StageId, boolean> = {
    block1: second || ended,
    block2: second && ended,
    postTask: second && exported,
    exportDone: exported,
    exited: session.exitedAt !== null
  };
  const here = (id: StageId) => second || id === "block1" || id === "exportDone" || id === "exited";
  const current = session.exitedAt === null ? ORDER.find((id) => here(id) && !done[id]) : undefined;
  return ORDER.map((id) => ({
    id,
    label: LABELS[id],
    state: done[id] ? "done" : id === current ? "now" : "next"
  }));
}

/** The note for the researcher once the last block has been exited, since nothing after that is in the export */
export function showsExplorationNote(session: StudySession): boolean {
  return session.exitedAt !== null && session.block === 2;
}

export const EXPLORATION_NOTE = "Exploration: nothing from here is in the study export.";
