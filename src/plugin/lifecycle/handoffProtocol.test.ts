import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HandoffPluginMessage, HandoffUiMessage } from "../../shared/handoff/handoffMessages";
import type { StudySession } from "../../shared/study/studyTypes";
import { buildTree, addCafeTexts } from "../roles/testing/fakeFigma";
import { STORAGE_KEY_ADJUST_LOG, STORAGE_KEY_PROFILE } from "../storage/storageKeys";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { emitStudy } from "../study/adapter/studyEmitter";
import { handleHandoffMessage } from "./handoffProtocol";
import { handleExplanationOrRole, isExplanationOrRole } from "./otherProtocols";

vi.mock("../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../shared/handoffFlags")>()),
  FEATURE_HANDOFF: true
}));
vi.mock("../study/adapter/studySessionStore", async (original) => ({
  ...(await original<typeof import("../study/adapter/studySessionStore")>()),
  activeStudySession: vi.fn()
}));
vi.mock("../study/adapter/studyEmitter", () => ({ emitStudy: vi.fn() }));

const SIG = "#9A9A9A|#FFFFFF|unbound|4.5";
const SESSION: StudySession = {
  schemaVersion: 1,
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  consentConfirmedAt: "t",
  phase: "designing",
  startedAt: "t",
  revealedAt: null,
  endedAt: null,
  exports: [],
  exitedAt: null
};
const ALL: HandoffUiMessage[] = [
  { type: "HANDOFF_DATA_REQUEST" },
  {
    type: "HANDOFF_NOTES_SET",
    nodeId: "t1",
    notes: [{ category: "name", text: "Open menu", updatedAt: "2026-10-28T10:00:00.000Z" }]
  },
  {
    type: "HANDOFF_META_SET",
    signature: SIG,
    meta: { signOff: "signed", leaveOut: false, signedBy: "Jo" }
  },
  { type: "HANDOFF_FILE_URL_SET", url: "https://www.figma.com/design/KEY/Checkout" }
];
const ALT: HandoffUiMessage[] = [
  { type: "HANDOFF_ALT_INVENTORY_REQUEST" },
  {
    type: "HANDOFF_ALT_SET",
    nodeId: "t1",
    text: "A cafe sign",
    decorative: false,
    source: "designer"
  }
];
const SUGGEST: HandoffUiMessage[] = [
  { type: "HANDOFF_ALT_CROP_REQUEST", nodeId: "t1" },
  { type: "HANDOFF_ALT_CACHE_REQUEST" },
  {
    type: "HANDOFF_ALT_CACHE_SET",
    entries: [
      {
        imageHash: "h",
        modelId: "m",
        kind: "describe",
        text: "Order summary icon",
        at: "2026-11-05T10:00:00.000Z"
      }
    ]
  }
];
const DRAFTS_MESSAGE: HandoffUiMessage = {
  type: "HANDOFF_DRAFTS_SET",
  drafts: {
    "pm|left|m": {
      audience: "pm",
      blockId: "left",
      modelId: "m",
      structureHash: "abcd1234",
      sentences: ["Detected: {L1}"],
      generatedAt: "2026-10-28T10:00:00.000Z"
    }
  }
};

interface Spies {
  gets: ReturnType<typeof vi.fn>;
  sets: ReturnType<typeof vi.fn>;
  node: ReturnType<typeof vi.fn>;
}
let spies: Spies;
let replies: HandoffPluginMessage[];

let tree: ReturnType<typeof buildTree>;

function spyOnFigma(): Spies {
  tree = buildTree();
  addCafeTexts(tree);
  const root = figma.root as unknown as {
    name: string;
    getPluginData: (k: string) => string;
    setPluginData: (k: string, v: string) => void;
  };
  root.name = "Checkout";
  const gets = vi.fn(root.getPluginData);
  const sets = vi.fn(root.setPluginData);
  root.getPluginData = gets;
  root.setPluginData = sets;
  const original = figma.getNodeByIdAsync.bind(figma);
  const node = vi.fn(original);
  (figma as unknown as { getNodeByIdAsync: unknown }).getNodeByIdAsync = node;
  return { gets, sets, node };
}

async function run(message: HandoffUiMessage): Promise<void> {
  await handleHandoffMessage(message, (reply) => replies.push(reply));
}

beforeEach(() => {
  spies = spyOnFigma();
  replies = [];
  vi.mocked(activeStudySession).mockReturnValue(null);
  vi.mocked(emitStudy).mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe("while a study session is active", () => {
  beforeEach(() => vi.mocked(activeStudySession).mockReturnValue(SESSION));

  it.each(
    [...ALL, ...ALT, ...SUGGEST, DRAFTS_MESSAGE].map((message) => [message.type, message] as const)
  )("refuses %s with no read and no write", async (_name, message) => {
    await run(message);
    expect(replies).toEqual([{ type: "HANDOFF_REFUSED" }]);
    expect(spies.gets).not.toHaveBeenCalled();
    expect(spies.sets).not.toHaveBeenCalled();
    expect(spies.node).not.toHaveBeenCalled();
  });

  it("still refuses once the block has ended, until the researcher exits", async () => {
    vi.mocked(activeStudySession).mockReturnValue({ ...SESSION, phase: "ended" });
    await run(ALL[0]);
    expect(replies).toEqual([{ type: "HANDOFF_REFUSED" }]);
  });
});

describe("with no study session", () => {
  it("answers a data request without writing anything", async () => {
    await run({ type: "HANDOFF_DATA_REQUEST" });
    const [data] = replies;
    expect(data).toMatchObject({
      type: "HANDOFF_DATA",
      fileName: "Checkout",
      issues: [],
      decisions: {},
      adjustLog: [],
      notes: {},
      meta: {},
      fileUrl: null
    });
    expect(spies.sets).not.toHaveBeenCalled();
  });

  it("returns the Adjust log as stored and leaves consent and the log alone", async () => {
    const entry = {
      issueId: "contrast:1:1",
      optionChosen: "a",
      beforeHex: "#9A9A9A",
      beforeRatio: 2.8,
      afterHex: "#595959",
      afterRatio: 7,
      wasBound: false,
      wheelOpened: false,
      hexRejected: false,
      abandoned: false,
      scope: "instances",
      instanceCount: 2,
      loggedAt: "2026-10-28T09:00:00.000Z"
    };
    figma.root.setPluginData(STORAGE_KEY_ADJUST_LOG, JSON.stringify([entry]));
    spies.sets.mockClear();
    await run({ type: "HANDOFF_DATA_REQUEST" });
    expect(replies[0]).toMatchObject({ adjustLog: [entry] });
    const written = spies.sets.mock.calls.map(([key]) => key);
    expect(written).not.toContain(STORAGE_KEY_ADJUST_LOG);
    expect(written).not.toContain(STORAGE_KEY_PROFILE);
    expect(spies.gets.mock.calls.map(([key]) => key)).not.toContain(STORAGE_KEY_PROFILE);
  });

  it("writes notes, meta and the file address and replies with the result", async () => {
    for (const message of ALL.slice(1)) await run(message);
    expect(replies).toEqual([
      { type: "HANDOFF_WRITE_RESULT", target: "notes", nodeId: "t1", saved: true },
      {
        type: "HANDOFF_WRITE_RESULT",
        target: "meta",
        saved: true,
        meta: { [SIG]: { signOff: "signed", leaveOut: false, signedBy: "Jo" } }
      },
      {
        type: "HANDOFF_WRITE_RESULT",
        target: "fileUrl",
        saved: true,
        fileUrl: "https://www.figma.com/design/KEY/Checkout"
      }
    ]);
    await run({ type: "HANDOFF_DATA_REQUEST" });
    expect(replies[3]).toMatchObject({
      notes: { t1: [{ category: "name", text: "Open menu" }] },
      fileUrl: "https://www.figma.com/design/KEY/Checkout"
    });
  });

  it("keeps the signature the panel sent and prunes the rest with a live list", async () => {
    const other = "#777777|#FFFFFF|unbound|4.5";
    const meta = { signOff: "signed" as const, leaveOut: false };
    await run({ type: "HANDOFF_META_SET", signature: other, meta });
    await run({ type: "HANDOFF_META_SET", signature: SIG, meta, live: [] });
    expect(Object.keys((replies[1] as { meta: object }).meta)).toEqual([SIG]);
  });

  it("stores the drafts, sends them back with the data, and writes nothing else", async () => {
    await run(DRAFTS_MESSAGE);
    expect(replies[0]).toMatchObject({ target: "drafts", saved: true });
    expect(spies.sets.mock.calls.map(([key]) => key)).toEqual(["cadt.handoff.drafts.v1"]);
    await run({ type: "HANDOFF_DATA_REQUEST" });
    expect(replies[1]).toMatchObject({
      drafts: DRAFTS_MESSAGE.type === "HANDOFF_DRAFTS_SET" ? DRAFTS_MESSAGE.drafts : {}
    });
  });

  it("reports a refused write as not saved", async () => {
    await run({ type: "HANDOFF_FILE_URL_SET", url: "https://evil.com/design/KEY/x" });
    expect(replies[0]).toMatchObject({ target: "fileUrl", saved: false, fileUrl: null });
  });

  it("appends nothing to the study log on any path", async () => {
    for (const message of ALL) await run(message);
    expect(emitStudy).not.toHaveBeenCalled();
    const keys = spies.sets.mock.calls.map(([key]) => String(key));
    expect(keys.filter((key) => key.startsWith("cadt.study"))).toEqual([]);
  });
});

describe("alt text messages with no study session", () => {
  it("answers an inventory request with the image layers and writes nothing", async () => {
    tree.frame("i1", "Hero", { fills: [{ type: "IMAGE", imageHash: "h1" }] });
    await run(ALT[0]);
    expect(replies).toEqual([
      {
        type: "HANDOFF_ALT_INVENTORY",
        layers: [
          {
            nodeId: "i1",
            name: "Hero",
            screenId: "s1",
            screenName: "A1",
            width: 200,
            height: 100,
            imageHash: "h1"
          }
        ]
      }
    ]);
    expect(spies.sets).not.toHaveBeenCalled();
  });

  it("writes an alt note with its source and keeps the layer's other notes", async () => {
    await run(ALL[1]);
    await run({
      type: "HANDOFF_ALT_SET",
      nodeId: "t1",
      text: "  A cafe sign ",
      decorative: false,
      source: "ai_edited"
    });
    expect(replies[1]).toEqual({
      type: "HANDOFF_WRITE_RESULT",
      target: "notes",
      nodeId: "t1",
      saved: true
    });
    await run({ type: "HANDOFF_DATA_REQUEST" });
    expect(replies[2]).toMatchObject({
      notes: {
        t1: [
          { category: "alt", text: "A cafe sign", source: "ai_edited" },
          { category: "name", text: "Open menu" }
        ]
      }
    });
  });

  it("marks a layer decorative and clears the alt note when the answer is empty", async () => {
    await run({
      type: "HANDOFF_ALT_SET",
      nodeId: "t1",
      text: "ignored",
      decorative: true,
      source: "ai"
    });
    await run({ type: "HANDOFF_DATA_REQUEST" });
    expect(replies[1]).toMatchObject({
      notes: { t1: [{ category: "alt", text: "", decorative: true }] }
    });
    expect(
      (replies[1] as unknown as { notes: { t1: { source?: string }[] } }).notes.t1[0].source
    ).toBeUndefined();
    await run({
      type: "HANDOFF_ALT_SET",
      nodeId: "t1",
      text: " ",
      decorative: false,
      source: "designer"
    });
    await run({ type: "HANDOFF_DATA_REQUEST" });
    expect(replies[3]).toMatchObject({ notes: {} });
  });

  it("reports a layer that is gone as not saved", async () => {
    await run({
      type: "HANDOFF_ALT_SET",
      nodeId: "gone",
      text: "x",
      decorative: false,
      source: "designer"
    });
    expect(replies[0]).toMatchObject({ saved: false });
  });
});

describe("alt text suggestion messages with no study session", () => {
  it("sends a crop of one layer, and a reason when it cannot", async () => {
    await run(SUGGEST[0]);
    await run({ type: "HANDOFF_ALT_CROP_REQUEST", nodeId: "nope" });
    expect(replies[0]).toMatchObject({ type: "HANDOFF_ALT_CROP", nodeId: "t1" });
    expect(replies[1]).toEqual({
      type: "HANDOFF_ALT_CROP",
      nodeId: "nope",
      ok: false,
      reason: "layer-gone"
    });
  });

  it("saves the suggestions in the file and sends them back, and an empty request reads them", async () => {
    await run(SUGGEST[1]);
    await run(SUGGEST[2]);
    await run(SUGGEST[1]);
    expect(replies[0]).toEqual({ type: "HANDOFF_ALT_CACHE", entries: [] });
    expect(replies[1]).toMatchObject({ type: "HANDOFF_ALT_CACHE", saved: true });
    expect(
      (replies[2] as { entries: { imageHash: string }[] }).entries.map((e) => e.imageHash)
    ).toEqual(["h"]);
  });

  it("emits nothing to the study log", async () => {
    for (const message of SUGGEST) await run(message);
    expect(emitStudy).not.toHaveBeenCalled();
  });
});

describe("routing", () => {
  it("is picked up by the shared router and answered", async () => {
    expect(isExplanationOrRole({ type: "HANDOFF_DATA_REQUEST" })).toBe(true);
    expect(isExplanationOrRole({ type: "HANDOFF_META_SET", signature: "bad", meta: {} })).toBe(
      false
    );
    await handleExplanationOrRole({ type: "HANDOFF_DATA_REQUEST" }, (reply) =>
      replies.push(reply as HandoffPluginMessage)
    );
    expect(replies[0].type).toBe("HANDOFF_DATA");
  });
});
