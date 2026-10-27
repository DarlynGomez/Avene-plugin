import type { HandoffDataMessage } from "../../shared/handoff/handoffMessages";
import { loadDecisions } from "../accountability/decisionStore";
import { loadIssues } from "../accountability/issueStore";
import { loadAdjustLog } from "../adjust/adapter/adjustLogging";
import { loadFileUrl } from "../handoff/adapter/fileUrlStore";
import { loadHandoffMeta } from "../handoff/adapter/metaStore";
import { loadAllNotes } from "../handoff/adapter/notesStore";
import { buildDisplayList } from "./issueDisplay";

/** Everything the panel builds a document from, read as stored and changed in no way */
export async function buildHandoffData(): Promise<HandoffDataMessage> {
  return {
    type: "HANDOFF_DATA",
    generatedAt: new Date().toISOString(),
    fileName: figma.root.name,
    issues: await buildDisplayList(await loadIssues()),
    decisions: loadDecisions(),
    adjustLog: loadAdjustLog(),
    notes: await loadAllNotes(),
    meta: loadHandoffMeta(),
    fileUrl: loadFileUrl()
  };
}
