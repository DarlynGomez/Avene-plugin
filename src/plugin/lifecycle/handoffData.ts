import type { HandoffDataMessage } from "../../shared/handoff/handoffMessages";
import type { NodeNote } from "../../shared/handoff/noteStorage";
import { BUILD_INFO } from "../buildInfo";
import { loadDecisions } from "../accountability/decisionStore";
import { loadIssues } from "../accountability/issueStore";
import { loadAdjustLog } from "../adjust/adapter/adjustLogging";
import { loadDraftCache } from "../handoff/adapter/draftCacheStore";
import { loadFileUrl } from "../handoff/adapter/fileUrlStore";
import { loadHandoffMeta } from "../handoff/adapter/metaStore";
import { loadAllNotes } from "../handoff/adapter/notesStore";
import { buildDisplayList } from "./issueDisplay";

async function namesOf(notes: Record<string, NodeNote[]>): Promise<Record<string, string>> {
  const noteNames: Record<string, string> = {};
  for (const id of Object.keys(notes)) {
    noteNames[id] = (await figma.getNodeByIdAsync(id))?.name ?? "";
  }
  return noteNames;
}

/**
 * What the alt text checks read during a study session: the alt notes and their layer names only
 * Nothing a handoff document is built from, so the participant panel never holds it
 */
export async function buildAltNotesData(): Promise<HandoffDataMessage> {
  const notes: Record<string, NodeNote[]> = {};
  for (const [id, list] of Object.entries(await loadAllNotes())) {
    const alt = list.filter((note) => note.category === "alt");
    if (alt.length > 0) notes[id] = alt;
  }
  return {
    type: "HANDOFF_DATA",
    generatedAt: new Date().toISOString(),
    fileName: "",
    issues: [],
    decisions: {},
    adjustLog: [],
    notes,
    noteNames: await namesOf(notes),
    meta: {},
    fileUrl: null,
    drafts: {}
  };
}

/** Everything the panel builds a document from, read as stored and changed in no way */
export async function buildHandoffData(): Promise<HandoffDataMessage> {
  const notes = await loadAllNotes();
  const noteNames = await namesOf(notes);
  return {
    type: "HANDOFF_DATA",
    generatedAt: new Date().toISOString(),
    build: BUILD_INFO.commit,
    fileName: figma.root.name,
    issues: await buildDisplayList(await loadIssues()),
    decisions: loadDecisions(),
    adjustLog: loadAdjustLog(),
    notes,
    noteNames,
    meta: loadHandoffMeta(),
    fileUrl: loadFileUrl(),
    drafts: loadDraftCache()
  };
}
