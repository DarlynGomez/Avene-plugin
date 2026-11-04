import { checkDraft } from "../../shared/handoff/blockDraft";
import { putEntry, type DraftCache } from "../../shared/handoff/draftCache";
import {
  fallbackLine,
  prepareDraftRequest,
  type DraftServerRequest
} from "../../shared/handoff/draftRequest";
import type { Audience, AudienceDoc, DocSection } from "../../shared/handoff/types";
import type { DraftAsk } from "./draftClient";

export interface RunDeps {
  ask: (request: DraftServerRequest) => Promise<DraftAsk>;
  now: () => string;
}

export interface RunResult {
  cache: DraftCache;
  /** A plain line for each block that could not be drafted, by "audience|block" */
  notes: Record<string, string>;
  /** Set when the server was down, the rest of the run is not tried */
  stopped: string | null;
}

export const blockKey = (audience: Audience, blockId: string) => `${audience}|${blockId}`;

/** The fixed Not covered block is never drafted, and neither is an empty one */
export function draftableSections(doc: AudienceDoc): DocSection[] {
  return doc.sections.filter((s) => s.id !== "notCovered" && s.lines.length > 0);
}

/** One block at a time, ids only; a failure leaves the template and says why in one line */
export async function runDrafts(
  deps: RunDeps,
  docs: Readonly<Record<Audience, AudienceDoc>>,
  audiences: readonly Audience[],
  start: DraftCache,
  onProgress: (done: number, total: number) => void
): Promise<RunResult> {
  const jobs = audiences.flatMap((a) =>
    draftableSections(docs[a]).map((section) => ({ a, section }))
  );
  let cache = start;
  const notes: Record<string, string> = {};
  for (const [index, { a, section }] of jobs.entries()) {
    onProgress(index, jobs.length);
    const doc = docs[a];
    const key = blockKey(a, section.id);
    const request = prepareDraftRequest(a, section, doc.slots);
    if (!request) {
      notes[key] = fallbackLine("values");
      continue;
    }
    const answer = await deps.ask(request);
    if (answer.kind === "transport") return { cache, notes, stopped: fallbackLine(answer.reason) };
    if (answer.reply.reason !== "ok") {
      notes[key] = fallbackLine(answer.reply.reason);
      continue;
    }
    const checked = checkDraft(answer.reply.sentences, section, doc.slots);
    if (!checked.ok) {
      notes[key] = fallbackLine("rejected");
      continue;
    }
    cache = putEntry(cache, {
      audience: a,
      blockId: section.id,
      modelId: answer.reply.model ?? "unknown",
      structureHash: doc.structureHash,
      sentences: checked.sentences,
      generatedAt: deps.now()
    });
  }
  onProgress(jobs.length, jobs.length);
  return { cache, notes, stopped: null };
}
