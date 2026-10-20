import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROLE_DATA_KEY } from "../../shared/roles/roleConfig";
import { isRolePluginMessage, isRoleUiMessage } from "../../shared/roles/roleMessages";
import type { RolePluginMessage } from "../../shared/roles/roleMessages";
import { parseReviewCsv, reviewCsv, type ReviewRow } from "../../shared/roles/reviewCsv";
import type { ReviewResult } from "../../shared/roles/reviewDecision";
import { inputKeyOf } from "../../shared/roles/roleStorage";
import { writeSuggestion } from "./adapter/roleData";
import { EXPORT_ROLE_SUGGESTIONS_COMMAND, IMPORT_ROLE_REVIEW_COMMAND } from "./adapter/review";
import { importReview, requestReview, resetReview, subscribeReview } from "./adapter/review";
import { requestRoleCommand } from "./adapter/roleCommands";
import { buildRoleState, inputsFor, textNodeById } from "./adapter/roleState";
import { addCafeTexts, buildTree, type Tree } from "./testing/fakeFigma";
import { LIVE_DESIGNING } from "./testing/sessions";

vi.mock("../study/adapter/studySessionStore", () => ({ activeStudySession: () => LIVE_DESIGNING }));

let tree: Tree;
let sent: RolePluginMessage[];
const post = (message: RolePluginMessage) => void sent.push(message);
const stored = (id: string) =>
  JSON.parse(
    (tree.nodes.get(id) as never as { getPluginData: (k: string) => string }).getPluginData(
      ROLE_DATA_KEY
    ) || "null"
  );

async function nodeOf(id: string): Promise<NonNullable<Awaited<ReturnType<typeof textNodeById>>>> {
  const node = await textNodeById(id);
  if (!node) throw new Error(`no text node ${id}`);
  return node;
}

async function suggest(id: string, label: string, reviewed = false) {
  const node = await nodeOf(id);
  writeSuggestion(node, {
    label: label as never,
    source: "ai",
    model: "frozen:tag",
    reviewed,
    live: false,
    inputKey: inputKeyOf(await inputsFor(node)),
    at: "then"
  });
}

async function exported(): Promise<ReviewRow[]> {
  requestReview(EXPORT_ROLE_SUGGESTIONS_COMMAND);
  sent = [];
  await subscribeReview(post);
  const mode = sent[0];
  if (mode.type !== "ROLE_REVIEW_MODE" || mode.mode !== "export") throw new Error("not export");
  return parseReviewCsv(mode.csv) ?? [];
}

async function imported(rows: ReviewRow[]): Promise<ReviewResult> {
  sent = [];
  await importReview(reviewCsv(rows), post);
  const last = sent[sent.length - 1];
  if (last.type !== "ROLE_REVIEW_RESULT") throw new Error("no result");
  return last.result;
}

beforeEach(() => {
  resetReview();
  sent = [];
  tree = buildTree();
  addCafeTexts(tree);
});
afterEach(() => vi.unstubAllGlobals());

describe("export", () => {
  it("waits for the panel and stays quiet for a plain open", async () => {
    requestRoleCommand("open");
    await subscribeReview(post);
    expect(sent).toEqual([]);
  });

  it("lists every visible text layer with a suggestion, the final label starting as the model's", async () => {
    await suggest("t4", "caption");
    await suggest("t5", "label", true);
    const rows = await exported();
    expect(
      rows.map((r) => [r.nodeId, r.modelLabel, r.finalLabel, r.reviewed, r.model, r.screen])
    ).toEqual([
      ["t4", "caption", "caption", "no", "frozen:tag", "A1"],
      ["t5", "label", "label", "yes", "frozen:tag", "A1"]
    ]);
    expect(rows[0].inputKey).toBe("16|600|5|price");
  });

  it("holds no layer text, only the layer name", async () => {
    await suggest("t4", "caption");
    requestRoleCommand(EXPORT_ROLE_SUGGESTIONS_COMMAND);
    await subscribeReview(post);
    const mode = sent[0];
    expect(mode.type === "ROLE_REVIEW_MODE" && mode.mode === "export" && mode.csv).not.toContain(
      "$9.50"
    );
    expect(mode.type === "ROLE_REVIEW_MODE" && mode.mode === "export" && mode.count).toBe(1);
  });

  it("skips a hidden layer", async () => {
    await suggest("t4", "caption");
    (tree.nodes.get("t4") as unknown as { visible: boolean }).visible = false;
    expect(await exported()).toEqual([]);
  });
});

describe("import", () => {
  it("tells the panel to ask for a file", async () => {
    requestRoleCommand(IMPORT_ROLE_REVIEW_COMMAND);
    await subscribeReview(post);
    expect(sent).toEqual([{ type: "ROLE_REVIEW_MODE", mode: "import" }]);
  });

  it("round trips: a reviewed yes sets reviewed and the question is then shown", async () => {
    await suggest("t4", "caption");
    expect((await buildRoleState("t4")).suggestion).toBeNull();
    const rows = await exported();
    const result = await imported(
      rows.map((r) => ({ ...r, reviewed: "yes", finalLabel: "label" }))
    );
    expect(result).toMatchObject({ imported: 1, removed: 0, unreadable: false });
    expect(stored("t4").suggestion).toMatchObject({
      label: "label",
      reviewed: true,
      live: false,
      model: "frozen:tag",
      inputKey: rows[0].inputKey
    });
    expect((await buildRoleState("t4")).suggestion).toEqual({
      label: "label",
      model: "frozen:tag",
      live: false
    });
  });

  it("changes nothing for a row not marked yes", async () => {
    await suggest("t4", "caption");
    const before = JSON.stringify(stored("t4"));
    const rows = await exported();
    const result = await imported(rows.map((r) => ({ ...r, finalLabel: "heading" })));
    expect(result).toMatchObject({
      imported: 0,
      removed: 0,
      notFound: 0,
      layerChanged: 0,
      labelNotOnList: 0
    });
    expect(JSON.stringify(stored("t4"))).toBe(before);
  });

  it("removes the suggestion for unsure and keeps an answer", async () => {
    await suggest("t4", "caption");
    const node = await nodeOf("t4");
    node.setPluginData(
      ROLE_DATA_KEY,
      JSON.stringify({
        ...stored("t4"),
        answer: { role: "label", response: "changed", from: "ai", at: "t" }
      })
    );
    const rows = await exported();
    const result = await imported(
      rows.map((r) => ({ ...r, reviewed: "yes", finalLabel: "unsure" }))
    );
    expect(result.removed).toBe(1);
    expect(stored("t4").suggestion).toBeUndefined();
    expect(stored("t4").answer.role).toBe("label");
  });

  it("skips and counts each reason", async () => {
    await suggest("t4", "caption");
    await suggest("t5", "caption");
    await suggest("t6", "caption");
    const [a, b, c] = await exported();
    const yes = { reviewed: "yes", finalLabel: "heading" };
    const result = await imported([
      { ...a, ...yes, nodeId: "gone" },
      { ...b, ...yes, inputKey: "12|400|1|old" },
      { ...c, ...yes, finalLabel: "title" },
      { ...a, ...yes, nodeId: "s1" }
    ]);
    expect(result).toMatchObject({ imported: 0, notFound: 2, layerChanged: 1, labelNotOnList: 1 });
    expect(stored("t5").suggestion.reviewed).toBe(false);
  });

  it("skips a layer changed since the export", async () => {
    await suggest("t4", "caption");
    const rows = await exported();
    (tree.nodes.get("t4") as unknown as { fontSize: number }).fontSize = 20;
    const result = await imported(rows.map((r) => ({ ...r, reviewed: "yes" })));
    expect(result.layerChanged).toBe(1);
    expect(stored("t4").suggestion.reviewed).toBe(false);
  });

  it("reports a file that is not an export", async () => {
    sent = [];
    await importReview("a,b\n1,2\n", post);
    expect(sent).toEqual([
      { type: "ROLE_REVIEW_RESULT", result: expect.objectContaining({ unreadable: true }) }
    ]);
  });
});

describe("the review messages", () => {
  it("are accepted in shape only", () => {
    expect(isRoleUiMessage({ type: "ROLE_REVIEW_SUBSCRIBE" })).toBe(true);
    expect(isRoleUiMessage({ type: "ROLE_REVIEW_IMPORT", csv: "a" })).toBe(true);
    expect(isRoleUiMessage({ type: "ROLE_REVIEW_IMPORT", csv: 4 })).toBe(false);
    expect(isRolePluginMessage({ type: "ROLE_REVIEW_MODE" })).toBe(true);
    expect(isRolePluginMessage({ type: "ROLE_REVIEW_RESULT" })).toBe(true);
  });
});
