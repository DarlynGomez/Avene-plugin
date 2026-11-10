import type { ImageLayer } from "./alt/altTypes";
import { deriveRoots } from "../grouping/deriveRoots";
import { assembleGroupableFindings } from "../grouping/assembleFinding";
import type { IssueSummary } from "../issues/issueTypes";
import type { HandoffDataMessage } from "./handoffMessages";
import { attachLinks, nodeLink, parseFileUrl } from "./links";
import type {
  HandoffChange,
  HandoffFinding,
  HandoffInput,
  HandoffNote,
  HandoffQuestion,
  HandoffScreen
} from "./types";

export interface InputChoices {
  /** Screens to include, all of them when absent */
  screenIds?: readonly string[];
  reviewer?: { name: string; date: string };
  /** From the image layer inventory, the layers of the chosen screens are the ones counted */
  imageLayers?: readonly ImageLayer[];
}

function screensOf(findings: readonly HandoffFinding[]): HandoffScreen[] {
  const seen = new Map<string, HandoffScreen>();
  for (const finding of findings) {
    if (!seen.has(finding.screenId))
      seen.set(finding.screenId, { id: finding.screenId, name: finding.screenName });
  }
  return [...seen.values()];
}

function changesOf(
  data: HandoffDataMessage,
  byId: ReadonlyMap<string, IssueSummary>
): HandoffChange[] {
  return data.adjustLog.flatMap((entry) => {
    const issue = byId.get(entry.issueId);
    if (!issue || entry.abandoned || entry.optionChosen === null) return [];
    if (entry.afterHex === null || entry.afterRatio === null) return [];
    return [
      {
        nodeName: issue.nodeName,
        beforeHex: entry.beforeHex,
        beforeRatio: entry.beforeRatio,
        afterHex: entry.afterHex,
        afterRatio: entry.afterRatio,
        instanceCount: entry.instanceCount
      }
    ];
  });
}

/** Questions and the other notes, with the layer name and a link when a file address was pasted */
function notesOf(data: HandoffDataMessage, linkOf: (id: string) => string | undefined) {
  const questions: HandoffQuestion[] = [];
  const notes: HandoffNote[] = [];
  for (const [nodeId, list] of Object.entries(data.notes)) {
    for (const note of list) {
      const link = linkOf(nodeId);
      if (note.category === "question" && note.owner) {
        questions.push({ text: note.text, owner: note.owner, ...(link ? { link } : {}) });
      } else if (note.category !== "question") {
        notes.push({
          nodeId,
          nodeName: data.noteNames[nodeId] ?? "",
          note,
          ...(link ? { link } : {})
        });
      }
    }
  }
  return { questions, notes };
}

/** Every signature that still exists, the panel sends it so stale handoff entries can go */
export function liveSignatures(data: HandoffDataMessage): Set<string> {
  return new Set(deriveRoots(assembleGroupableFindings(data.issues)).map((root) => root.signature));
}

/** The plain data a document is built from, made from what the sandbox sent */
export function inputFromData(data: HandoffDataMessage, choices: InputChoices = {}): HandoffInput {
  const ref = parseFileUrl(data.fileUrl ?? undefined);
  const byId = new Map(data.issues.map((issue) => [issue.id, issue]));
  const findings = attachLinks(
    assembleGroupableFindings(data.issues).map((finding) => ({
      ...finding,
      changedSinceIgnore: byId.get(finding.issueId)?.changedSinceIgnore
    })),
    ref
  );
  const screens = screensOf(findings).filter(
    (s) => !choices.screenIds || choices.screenIds.includes(s.id)
  );
  const { questions, notes } = notesOf(data, (id) => nodeLink(ref, id) ?? undefined);
  return {
    fileName: data.fileName,
    ...(data.fileUrl ? { fileUrl: data.fileUrl } : {}),
    generatedAt: data.generatedAt,
    screens,
    findings,
    decisions: data.decisions,
    meta: data.meta,
    changes: changesOf(data, byId),
    questions,
    notes,
    ...(choices.imageLayers
      ? {
          imageLayers: choices.imageLayers.filter(
            (layer) => !choices.screenIds || choices.screenIds.includes(layer.screenId)
          )
        }
      : {}),
    ...(choices.reviewer ? { reviewer: choices.reviewer } : {})
  };
}
