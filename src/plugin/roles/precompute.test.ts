import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RolePluginMessage } from "../../shared/roles/roleMessages";
import { ROLE_DATA_KEY, ROLE_RUN_KEY } from "../../shared/roles/roleConfig";
import type { RoleServerReply } from "../../shared/roles/roleRequest";
import {
  precomputeResult,
  requestPrecompute,
  resetPrecompute,
  subscribePrecompute
} from "./adapter/precompute";
import { addCafeTexts, buildTree, type Tree } from "./testing/fakeFigma";

vi.mock("../study/adapter/studySessionStore", () => ({ activeStudySession: () => null }));

let tree: Tree;
let sent: RolePluginMessage[];
const post = (message: RolePluginMessage) => void sent.push(message);
const ok = (label = "label"): RoleServerReply => ({
  label: label as never,
  reason: "ok",
  model: "frozen:tag",
  ms: 30
});
const items = () =>
  sent
    .filter((m) => m.type === "ROLE_PRECOMPUTE_ITEM")
    .map((m) => (m.type === "ROLE_PRECOMPUTE_ITEM" ? m.nodeId : ""));
const stored = (id: string) =>
  (tree.nodes.get(id) as never as { getPluginData: (k: string) => string }).getPluginData(
    ROLE_DATA_KEY
  );
const run = () =>
  JSON.parse(
    (
      (globalThis as unknown as { figma: { root: unknown } }).figma.root as unknown as {
        getPluginData: (k: string) => string;
      }
    ).getPluginData(ROLE_RUN_KEY)
  );

async function start() {
  requestPrecompute();
  await subscribePrecompute(post);
}

beforeEach(() => {
  resetPrecompute();
  sent = [];
  tree = buildTree();
  addCafeTexts(tree);
});
afterEach(() => vi.unstubAllGlobals());

describe("the precompute command", () => {
  it("waits for the panel, then sends only the layers no rule decided, one at a time", async () => {
    requestPrecompute();
    expect(sent).toEqual([]);
    await subscribePrecompute(post);
    expect(sent[0]).toEqual({ type: "ROLE_PRECOMPUTE_START", total: 3 });
    expect(items()).toEqual(["t4"]);
    const item = sent[1];
    expect(item.type === "ROLE_PRECOMPUTE_ITEM" && item.request.mode).toBe("precompute");
  });

  it("does nothing when the command was not asked for", async () => {
    await subscribePrecompute(post);
    expect(sent).toEqual([]);
  });

  it("writes each answer to the file before it sends the next layer", async () => {
    await start();
    await precomputeResult("t4", ok("label"), null, post);
    expect(JSON.parse(stored("t4")).suggestion).toMatchObject({
      label: "label",
      source: "ai",
      reviewed: false,
      live: false,
      model: "frozen:tag"
    });
    expect(run()).toMatchObject({ completed: 1, total: 6 });
    expect(items()).toEqual(["t4", "t5"]);
  });

  it("resumes after an interruption without repeating a finished layer", async () => {
    await start();
    await precomputeResult("t4", ok(), null, post);
    await precomputeResult("t5", ok("caption"), null, post);
    // The plugin is closed here, with one layer left
    resetPrecompute();
    sent = [];
    await start();
    expect(sent[0]).toEqual({ type: "ROLE_PRECOMPUTE_START", total: 1 });
    expect(items()).toEqual(["t6"]);
    await precomputeResult("t6", ok(), null, post);
    const done = sent[sent.length - 1];
    expect(done.type).toBe("ROLE_PRECOMPUTE_DONE");
    if (done.type !== "ROLE_PRECOMPUTE_DONE") return;
    expect(done.summary).toMatchObject({ total: 6, completed: 1, skipped: 5, failed: 0 });
    // Nothing was asked twice, the two finished layers keep what the first run wrote
    expect(JSON.parse(stored("t5")).suggestion.label).toBe("caption");
  });

  it("leaves a failed layer for the next run and records why", async () => {
    await start();
    await precomputeResult("t4", null, "timeout", post);
    await precomputeResult("t5", { ...ok(), reason: "rate-limited", label: "unsure" }, null, post);
    await precomputeResult("t6", ok(), null, post);
    expect(stored("t4")).toBe("");
    expect(stored("t5")).toBe("");
    expect(run().failed).toEqual([
      { nodeId: "t4", reason: "timeout" },
      { nodeId: "t5", reason: "rate-limited" }
    ]);
    resetPrecompute();
    sent = [];
    await start();
    expect(sent[0]).toEqual({ type: "ROLE_PRECOMPUTE_START", total: 2 });
    expect(items()).toEqual(["t4"]);
  });

  it("counts a model that answered unsure as finished, so it is not asked again", async () => {
    await start();
    await precomputeResult("t4", ok("unsure"), null, post);
    resetPrecompute();
    sent = [];
    await start();
    expect(items()).not.toContain("t4");
  });

  it("skips text that cannot be sent legibly, and says so in the report", async () => {
    tree.text("t8", "wide", "x".repeat(2000), 16, 500);
    await start();
    expect(items()).toEqual(["t4"]);
    for (const id of ["t4", "t5", "t6"]) await precomputeResult(id, ok(), null, post);
    const done = sent[sent.length - 1];
    expect(done.type === "ROLE_PRECOMPUTE_DONE" && done.summary.failed).toBe(1);
    expect(done.type === "ROLE_PRECOMPUTE_DONE" && done.summary.csv).toContain("too-small-to-send");
  });

  it("ignores an answer for a layer it did not ask about", async () => {
    await start();
    await precomputeResult("t6", ok(), null, post);
    expect(stored("t6")).toBe("");
  });

  it("writes a report row for every text layer, rules and model, and never any words", async () => {
    await start();
    for (const id of ["t4", "t5", "t6"]) await precomputeResult(id, ok(), null, post);
    const done = sent[sent.length - 1];
    if (done.type !== "ROLE_PRECOMPUTE_DONE") throw new Error("not done");
    const rows = done.summary.csv.trim().split("\n");
    expect(rows[0]).toBe("screen,layer name,node id,decided by,label,reason or failure,reviewed");
    expect(rows).toHaveLength(7);
    expect(done.summary.csv).not.toContain("Lakeside");
    expect(done.summary.csv).toMatch(/t1,rule,heading/);
  });
});
