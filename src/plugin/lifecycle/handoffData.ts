import type { HandoffDataMessage } from "../../shared/handoff/handoffMessages";
import { loadDecisions } from "../accountability/decisionStore";
import { loadIssues } from "../accountability/issueStore";
import { loadAdjustLog } from "../adjust/adapter/adjustLogging";
import { loadDraftCache } from "../handoff/adapter/draftCacheStore";
import { loadFileUrl } from "../handoff/adapter/fileUrlStore";
import { loadHandoffMeta } from "../handoff/adapter/metaStore";
import { loadAllNotes } from "../handoff/adapter/notesStore";
import { buildDisplayList } from "./issueDisplay";

/** Everything the panel builds a document from, read as stored and changed in no way */
export async function buildHandoffData(): Promise<HandoffDataMessage> {
  const notes = await loadAllNotes();
  const noteNames: Record<string, string> = {};
  for (const id of Object.keys(notes)) {
    noteNames[id] = (await figma.getNodeByIdAsync(id))?.name ?? "";
  }
  return {
    type: "HANDOFF_DATA",
    generatedAt: new Date().toISOString(),
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
