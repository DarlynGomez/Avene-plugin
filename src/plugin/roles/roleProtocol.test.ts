import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleRoleMessage } from "../lifecycle/roleProtocol";
import type { RolePluginMessage, RoleStateView } from "../../shared/roles/roleMessages";
import { ROLE_DATA_KEY } from "../../shared/roles/roleConfig";
import type { StudyEvent, StudyEventContext } from "../../shared/study/studyEvents";
import type { StudySession } from "../../shared/study/studyTypes";
import { addCafeTexts, buildTree, type Tree } from "./testing/fakeFigma";
import { LIVE_DESIGNING } from "./testing/sessions";

let session: StudySession | null = LIVE_DESIGNING;
const emitted: StudyEvent[] = [];
vi.mock("../study/adapter/studySessionStore", () => ({ activeStudySession: () => session }));
vi.mock("../study/adapter/studyEmitter", () => ({
  emitStudy: (build: (ctx: StudyEventContext) => StudyEvent[]) => {
    const ctx: StudyEventContext = {
      participantId: "P01",
      block: 1,
      task: "A",
      condition: "live",
      phase: "designing"
    };
    emitted.push(...build(ctx));
  }
}));

let tree: Tree;
let sent: RolePluginMessage[];
const reply = (message: RolePluginMessage) => void sent.push(message);
const lastState = (): RoleStateView => {
  const found = [...sent].reverse().find((m) => m.type === "ROLE_STATE");
  if (!found || found.type !== "ROLE_STATE") throw new Error("no state was sent");
  return found.state;
};
const data = (id: string) =>
  JSON.parse(
    tree.nodes.get(id)?.getPluginData
      ? (tree.nodes.get(id) as never as { getPluginData: (k: string) => string }).getPluginData(
          ROLE_DATA_KEY
        ) || "null"
      : "null"
  );
const serverSaid = (label: string, reason = "ok", model: string | null = "frozen:tag") => ({
  type: "ROLE_SERVER_RESULT" as const,
  nodeId: "t4",
  reply: { label: label as never, reason, model, ms: 40 }
});

beforeEach(() => {
  session = LIVE_DESIGNING;
  emitted.length = 0;
  sent = [];
  tree = buildTree();
  addCafeTexts(tree);
});
afterEach(() => vi.unstubAllGlobals());

describe("the query, the server result and the answer", () => {
  it("answers a query with the state, and asks for the server only for an undecided layer", async () => {
    await handleRoleMessage({ type: "ROLE_QUERY", nodeId: "t1" }, reply);
    expect(lastState()).toMatchObject({ rule: { role: "heading" }, request: null });
    await handleRoleMessage({ type: "ROLE_QUERY", nodeId: "t4" }, reply);
    expect(lastState().request).not.toBeNull();
  });

  it("keeps a live suggestion, shows it as a question, and does not ask again", async () => {
    await handleRoleMessage(serverSaid("label"), reply);
    expect(lastState()).toMatchObject({
      suggestion: { label: "label", model: "frozen:tag", live: true },
      request: null
    });
    expect(data("t4").suggestion).toMatchObject({ source: "ai", reviewed: false, live: true });
    expect(lastState().answer).toBeNull();
  });

  it("keeps nothing for a failure, an unsure reply with a reason, or a session that does not allow it", async () => {
    await handleRoleMessage(serverSaid("unsure", "timeout"), reply);
    await handleRoleMessage(serverSaid("unsure", "rate-limited"), reply);
    await handleRoleMessage(serverSaid("unsure", "mixed-size"), reply);
    await handleRoleMessage(serverSaid("unsure", "too-small-to-send"), reply);
    expect(data("t4")).toBeNull();
    session = null;
    await handleRoleMessage(serverSaid("label"), reply);
    expect(data("t4")).toBeNull();
  });

  it("an answer is kept and the state then holds it", async () => {
    await handleRoleMessage(
      { type: "ROLE_ANSWER", nodeId: "t4", role: "label", response: "changed" },
      reply
    );
    expect(lastState().answer).toEqual({ role: "label", response: "changed" });
    expect(data("t4").answer).toMatchObject({ role: "label", response: "changed", from: "none" });
  });

  it("never throws to the panel, a layer that is gone just gets an empty state", async () => {
    await expect(
      handleRoleMessage({ type: "ROLE_QUERY", nodeId: "gone" }, reply)
    ).resolves.toBeUndefined();
    expect(lastState().request).toBeNull();
  });
});

describe("role_answered", () => {
  const answered = () => emitted.filter((e) => e.type === "role_answered");

  it("says a rule produced the label that was shown, with the rule", async () => {
    await handleRoleMessage(
      { type: "ROLE_ANSWER", nodeId: "t1", role: "heading", response: "confirmed" },
      reply
    );
    expect(answered()).toEqual([
      expect.objectContaining({
        nodeId: "t1",
        role: "heading",
        source: "rule",
        suggested: "heading",
        response: "confirmed",
        ruleId: "N4"
      })
    ]);
  });

  it("says a live suggestion was shown, with the model as the service reported it", async () => {
    await handleRoleMessage(serverSaid("button text", "ok", "qwen2.5vl:32b-frozen"), reply);
    await handleRoleMessage(
      { type: "ROLE_ANSWER", nodeId: "t4", role: "label", response: "changed" },
      reply
    );
    expect(answered()[0]).toMatchObject({
      nodeId: "t4",
      role: "label",
      source: "ai_live",
      suggested: "button text",
      response: "changed",
      model: "qwen2.5vl:32b-frozen"
    });
  });

  it("says a reviewed precomputed suggestion was shown", async () => {
    const node = tree.nodes.get("t4") as never as { setPluginData: (k: string, v: string) => void };
    node.setPluginData(
      ROLE_DATA_KEY,
      JSON.stringify({
        v: 1,
        suggestion: {
          label: "label",
          source: "ai",
          model: "m",
          reviewed: true,
          live: false,
          inputKey: "16|600|5|price",
          at: "t"
        }
      })
    );
    await handleRoleMessage(
      { type: "ROLE_ANSWER", nodeId: "t4", role: "label", response: "confirmed" },
      reply
    );
    expect(answered()[0]).toMatchObject({
      source: "ai_precomputed",
      suggested: "label",
      model: "m"
    });
  });

  it("says nothing was shown, and never records an unreviewed guess as shown", async () => {
    await handleRoleMessage(
      { type: "ROLE_ANSWER", nodeId: "t4", role: "unsure", response: "unsure" },
      reply
    );
    expect(answered()[0]).toMatchObject({
      source: "none",
      suggested: null,
      response: "unsure",
      role: "unsure"
    });
    expect(answered()[0]).not.toHaveProperty("model");
  });

  it("holds no layer words, only ids, labels and the model", async () => {
    await handleRoleMessage(
      { type: "ROLE_ANSWER", nodeId: "t4", role: "label", response: "changed" },
      reply
    );
    expect(JSON.stringify(answered())).not.toContain("9.50");
  });
});
