import type { PrecomputeSummary, RolePluginMessage } from "../../../shared/roles/roleMessages";
import type { RoleServerReply } from "../../../shared/roles/roleRequest";
import { reportCsv, type ReportRow } from "../../../shared/roles/roleReport";
import { inputKeyOf } from "../../../shared/roles/roleStorage";
import { writeRunRecord, writeSuggestion } from "./roleData";
import { plan, rowFor } from "./precomputePlan";
import { prepareRequest } from "./roleRequestBuilder";
import { textNodeById, inputsFor } from "./roleState";

/** The menu command of the researcher run, the panel starts it once it has subscribed */
export const PRECOMPUTE_ROLES_COMMAND = "precompute-roles";

type Post = (message: RolePluginMessage) => void;

interface Run {
  queue: string[];
  index: number;
  rows: Map<string, ReportRow>;
  order: string[];
  skipped: number;
  completed: number;
  failed: { nodeId: string; reason: string }[];
  startedAt: string;
}

let pending = false;
let run: Run | null = null;

/** The researcher command asks for a run, the panel starts it once it has subscribed */
export function requestPrecompute(): void {
  pending = true;
}

/** Forgets any run in progress, as if the plugin had been closed, the file keeps what was written */
export function resetPrecompute(): void {
  pending = false;
  run = null;
}

function save(state: Run): void {
  writeRunRecord({
    v: 1,
    startedAt: state.startedAt,
    total: state.order.length,
    completed: state.completed,
    skipped: state.skipped,
    failed: state.failed
  });
}

function summary(state: Run): PrecomputeSummary {
  const rows = state.order.map((id) => state.rows.get(id)).filter((row): row is ReportRow => !!row);
  return {
    total: state.order.length,
    completed: state.completed,
    skipped: state.skipped,
    failed: state.failed.length,
    csv: reportCsv(rows)
  };
}

async function next(state: Run, post: Post): Promise<void> {
  while (state.index < state.queue.length) {
    const nodeId = state.queue[state.index];
    const node = await textNodeById(nodeId);
    const request = node ? await prepareRequest(node, await inputsFor(node), "precompute") : null;
    if (node && request) {
      post({
        type: "ROLE_PRECOMPUTE_ITEM",
        index: state.index + 1,
        total: state.queue.length,
        nodeId,
        request
      });
      return;
    }
    fail(state, nodeId, node, "too-small-to-send");
    state.index += 1;
    save(state);
  }
  post({ type: "ROLE_PRECOMPUTE_DONE", summary: summary(state) });
  run = null;
}

function fail(state: Run, nodeId: string, node: TextNode | null, reason: string): void {
  state.failed.push({ nodeId, reason });
  if (node) state.rows.set(nodeId, rowFor(node, { reasonOrFailure: reason }));
}

/** The panel is ready, begin the run the command asked for */
export async function subscribePrecompute(post: Post): Promise<void> {
  if (!pending) return;
  pending = false;
  const planned = await plan();
  run = { ...planned, index: 0, completed: 0, failed: [], startedAt: new Date().toISOString() };
  post({ type: "ROLE_PRECOMPUTE_START", total: run.queue.length });
  await next(run, post);
}

/** One item answered, or failed in the panel. It is written to the file before the next is sent */
export async function precomputeResult(
  nodeId: string,
  reply: RoleServerReply | null,
  failure: string | null,
  post: Post
): Promise<void> {
  const state = run;
  if (!state || state.queue[state.index] !== nodeId) return;
  const node = await textNodeById(nodeId);
  if (node && reply && reply.reason === "ok") {
    writeSuggestion(node, {
      label: reply.label,
      source: "ai",
      model: reply.model,
      reviewed: false,
      live: false,
      inputKey: inputKeyOf(await inputsFor(node)),
      at: new Date().toISOString()
    });
    state.completed += 1;
    state.rows.set(nodeId, rowFor(node, { by: "ai", label: reply.label, reasonOrFailure: "ok" }));
  } else {
    fail(state, nodeId, node, failure ?? reply?.reason ?? "unreachable");
  }
  state.index += 1;
  save(state);
  await next(state, post);
}
