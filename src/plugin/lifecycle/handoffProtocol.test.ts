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

interface Spies {
  gets: ReturnType<typeof vi.fn>;
  sets: ReturnType<typeof vi.fn>;
  node: ReturnType<typeof vi.fn>;
}
let spies: Spies;
let replies: HandoffPluginMessage[];

function spyOnFigma(): Spies {
  const tree = buildTree();
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

  it.each(ALL.map((message) => [message.type, message] as const))(
    "refuses %s with no read and no write",
    async (_name, message) => {
      await run(message);
      expect(replies).toEqual([{ type: "HANDOFF_REFUSED" }]);
      expect(spies.gets).not.toHaveBeenCalled();
      expect(spies.sets).not.toHaveBeenCalled();
      expect(spies.node).not.toHaveBeenCalled();
    }
  );

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
