import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROLE_DATA_KEY } from "../../shared/roles/roleConfig";
import type { StudySession } from "../../shared/study/studyTypes";
import { buildRoleState } from "./adapter/roleState";
import { addCafeTexts, buildTree, type Tree } from "./testing/fakeFigma";
import { ENDED, LIVE_DESIGNING, POST_DESIGNING, POST_REVIEWING } from "./testing/sessions";

let session: StudySession | null = LIVE_DESIGNING;
vi.mock("../study/adapter/studySessionStore", () => ({ activeStudySession: () => session }));

let tree: Tree;
let texts: ReturnType<typeof addCafeTexts>;
beforeEach(() => {
  session = LIVE_DESIGNING;
  tree = buildTree();
  texts = addCafeTexts(tree);
});
afterEach(() => vi.unstubAllGlobals());

describe("a rule that decides", () => {
  it("never calls the server and never exports an image", async () => {
    for (const node of [texts.title, texts.subtitle, texts.desc]) {
      const state = await buildRoleState(node.id);
      expect(state.rule).not.toBeNull();
      expect(state.request).toBeNull();
    }
    expect(tree.exports).toEqual([]);
  });

  it("says which rule and why", async () => {
    expect((await buildRoleState("t1")).rule).toEqual({
      role: "heading",
      ruleId: "N4",
      reason: 'Its layer name says it is a heading: "title".'
    });
    expect((await buildRoleState("t3")).rule?.ruleId).toBe("S5");
  });
});

describe("a layer no rule decides, in a live session", () => {
  it("is exported once and handed to the panel with the numbers the server reads", async () => {
    const state = await buildRoleState("t4");
    expect(state.rule).toBeNull();
    expect(tree.exports).toEqual([{ id: "t4", scale: 1 }]);
    expect(state.request).toMatchObject({
      image: "iVBORw==",
      crop: "node",
      exportScale: 1,
      fontSizePx: 16,
      backgroundHex: "#FFFFFF",
      mode: "live",
      inputs: { fontWeight: 600, wordCount: 1 }
    });
    expect(state.request?.inputs.sizeRatio).toBeCloseTo(16 / 14, 5);
    expect(state.request?.inputs.centerYFraction).toBeCloseTo(110 / 844, 5);
    expect(Object.keys(state.request?.inputs ?? {}).sort()).toEqual([
      "centerYFraction",
      "fontWeight",
      "sizeRatio",
      "wordCount"
    ]);
  });

  it("is exported large enough that the text is 14 pixels tall as sent", async () => {
    const small = tree.text("t9", "tag", "New", 10, 500);
    expect(small.id).toBe("t9");
    const state = await buildRoleState("t9");
    expect(state.request?.exportScale).toBe(1.5);
    expect(10 * 1.5).toBeGreaterThanOrEqual(14);
  });

  it("is not sent when the text could not be legible as sent", async () => {
    tree.text("t8", "wide", "x".repeat(2000), 16, 500);
    const state = await buildRoleState("t8");
    expect(state.request).toBeNull();
    expect(tree.exports.find((e) => e.id === "t8")).toBeUndefined();
  });

  it("is not sent when the font size is mixed", async () => {
    const { MIXED } = await import("./testing/fakeFigma");
    tree.text("t7", "mixed", "Two sizes here", 16, 500, { fontSize: MIXED });
    expect((await buildRoleState("t7")).request).toBeNull();
  });
});

describe("where the server may be asked", () => {
  it.each([
    ["live designing", LIVE_DESIGNING, true, true],
    ["post-task reviewing", POST_REVIEWING, true, true],
    ["post-task designing", POST_DESIGNING, false, false],
    ["after the block ended", ENDED, false, false],
    ["no session at all", null, true, false]
  ])("%s", async (_name, value, allowed, asked) => {
    session = value;
    const state = await buildRoleState("t4");
    expect(state.allowed).toBe(allowed);
    expect(state.request !== null).toBe(asked);
    expect(tree.exports.length).toBe(asked ? 1 : 0);
  });
});

describe("what is stored on the layer", () => {
  const store = (node: { setPluginData: (k: string, v: string) => void }, data: unknown) =>
    node.setPluginData(ROLE_DATA_KEY, JSON.stringify(data));
  const key = "16|600|5|price";
  const suggestion = {
    label: "label",
    source: "ai",
    model: "m",
    reviewed: false,
    live: false,
    inputKey: key,
    at: "t"
  };

  it("an answer is read back and the layer is not asked about again", async () => {
    store(texts.price as never, {
      v: 1,
      answer: { role: "label", response: "changed", from: "none", at: "t" }
    });
    const state = await buildRoleState("t4");
    expect(state.answer).toEqual({ role: "label", response: "changed" });
    expect(state.request).toBeNull();
  });

  it("a reviewed suggestion is shown as a question and not asked again", async () => {
    store(texts.price as never, { v: 1, suggestion: { ...suggestion, reviewed: true } });
    const state = await buildRoleState("t4");
    expect(state.suggestion).toEqual({ label: "label", model: "m", live: false });
    expect(state.request).toBeNull();
  });

  it("an unreviewed precomputed suggestion is never shown, and the layer is not asked about again", async () => {
    store(texts.price as never, { v: 1, suggestion });
    const state = await buildRoleState("t4");
    expect(state.suggestion).toBeNull();
    expect(state.request).toBeNull();
  });

  it("a live suggestion is shown without a review", async () => {
    store(texts.price as never, { v: 1, suggestion: { ...suggestion, live: true } });
    expect((await buildRoleState("t4")).suggestion).toMatchObject({ live: true });
  });

  it("a suggestion that no longer matches the layer is ignored and the layer is asked again", async () => {
    store(texts.price as never, {
      v: 1,
      suggestion: { ...suggestion, reviewed: true, inputKey: "12|400|5|price" }
    });
    const state = await buildRoleState("t4");
    expect(state.suggestion).toBeNull();
    expect(state.request).not.toBeNull();
  });

  it("a suggestion of an unsure label shows nothing but still counts as asked", async () => {
    store(texts.price as never, {
      v: 1,
      suggestion: { ...suggestion, label: "unsure", reviewed: true }
    });
    const state = await buildRoleState("t4");
    expect(state.suggestion).toBeNull();
    expect(state.request).toBeNull();
  });

  it("data of another version is read as absent", async () => {
    store(texts.price as never, { v: 2, answer: { role: "label", response: "changed" } });
    expect((await buildRoleState("t4")).answer).toBeNull();
  });
});

it("a node that is not text, or has gone, gives an empty state and no request", async () => {
  expect(await buildRoleState("s1")).toMatchObject({
    rule: null,
    suggestion: null,
    answer: null,
    request: null
  });
  expect((await buildRoleState("missing")).request).toBeNull();
});
