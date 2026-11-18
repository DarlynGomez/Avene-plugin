import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HandoffPluginMessage, HandoffUiMessage } from "../../shared/handoff/handoffMessages";
import type { StudyEvent, StudyEventContext } from "../../shared/study/studyEvents";
import { studyEventProblem } from "../../shared/study/studyEventSchema";
import type { StudySession } from "../../shared/study/studyTypes";
import { buildTree, addCafeTexts } from "../roles/testing/fakeFigma";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { emitStudy } from "../study/adapter/studyEmitter";
import { handleHandoffMessage } from "./handoffProtocol";

vi.mock("../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../shared/handoffFlags")>()),
  FEATURE_HANDOFF: true,
  FEATURE_ALT_IN_STUDY: true
}));
vi.mock("../study/adapter/studySessionStore", async (original) => ({
  ...(await original<typeof import("../study/adapter/studySessionStore")>()),
  activeStudySession: vi.fn()
}));
vi.mock("../study/adapter/studyEmitter", () => ({ emitStudy: vi.fn() }));

const LIVE: StudySession = {
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
const CTX: StudyEventContext = {
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  phase: "designing"
};
const NAME_NOTE: HandoffUiMessage = {
  type: "HANDOFF_NOTES_SET",
  nodeId: "t1",
  notes: [{ category: "name", text: "Open menu", updatedAt: "2026-10-28T10:00:00.000Z" }]
};
const ALT_SET: HandoffUiMessage = {
  type: "HANDOFF_ALT_SET",
  nodeId: "t1",
  text: "A cafe sign",
  decorative: false,
  source: "ai_edited"
};

let replies: HandoffPluginMessage[];

async function run(message: HandoffUiMessage): Promise<void> {
  await handleHandoffMessage(message, (reply) => replies.push(reply));
}

/** The events the handler queued, built against a fixed context */
function emitted(): StudyEvent[] {
  return vi
    .mocked(emitStudy)
    .mock.calls.flatMap(([build]) => build(CTX, { detected: new Set(), responded: new Set() }));
}

beforeEach(() => {
  const tree = buildTree();
  addCafeTexts(tree);
  (figma.root as unknown as { name: string }).name = "Checkout";
  replies = [];
  vi.mocked(emitStudy).mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe("the alt text checks during a session, while feedback shows", () => {
  it("answers the notes with the alt notes only, and nothing a handoff document is built from", async () => {
    vi.mocked(activeStudySession).mockReturnValue(null);
    await run(NAME_NOTE);
    await run(ALT_SET);
    vi.mocked(activeStudySession).mockReturnValue(LIVE);
    replies = [];
    await run({ type: "HANDOFF_DATA_REQUEST" });

    expect(replies[0]).toMatchObject({
      type: "HANDOFF_DATA",
      fileName: "",
      issues: [],
      decisions: {},
      adjustLog: [],
      meta: {},
      fileUrl: null,
      drafts: {}
    });
    const notes = (replies[0] as { notes: Record<string, { category: string }[]> }).notes;
    expect(notes.t1.map((note) => note.category)).toEqual(["alt"]);
  });

  it("saves an alt answer and logs where it came from, never the words", async () => {
    vi.mocked(activeStudySession).mockReturnValue(LIVE);
    await run(ALT_SET);

    expect(replies[0]).toMatchObject({ type: "HANDOFF_WRITE_RESULT", saved: true });
    const [event] = emitted();
    expect(event).toMatchObject({
      type: "alt_answered",
      nodeId: "t1",
      decorative: false,
      source: "ai_edited",
      cleared: false
    });
    expect(JSON.stringify(event)).not.toContain("cafe sign");
    expect(studyEventProblem(event)).toBeNull();
  });

  it("logs nothing for an answer that could not be saved", async () => {
    vi.mocked(activeStudySession).mockReturnValue(LIVE);
    await run({ ...ALT_SET, nodeId: "gone" } as HandoffUiMessage);
    expect(replies[0]).toMatchObject({ saved: false });
    expect(emitStudy).not.toHaveBeenCalled();
  });

  it("logs a picture sent for a live suggestion, and not a crop that failed", async () => {
    vi.mocked(activeStudySession).mockReturnValue({
      ...LIVE,
      condition: "post-task",
      phase: "reviewing"
    });
    await run({ type: "HANDOFF_ALT_CROP_REQUEST", nodeId: "t1" });
    await run({ type: "HANDOFF_ALT_CROP_REQUEST", nodeId: "gone" });

    expect(replies.map((reply) => (reply as { ok?: boolean }).ok)).toEqual([true, false]);
    const events = emitted();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "alt_suggestion_requested", nodeId: "t1" });
    expect(studyEventProblem(events[0])).toBeNull();
  });

  it("answers the inventory and the saved suggestions", async () => {
    vi.mocked(activeStudySession).mockReturnValue(LIVE);
    await run({ type: "HANDOFF_ALT_INVENTORY_REQUEST" });
    await run({ type: "HANDOFF_ALT_CACHE_REQUEST" });
    expect(replies.map((reply) => reply.type)).toEqual([
      "HANDOFF_ALT_INVENTORY",
      "HANDOFF_ALT_CACHE"
    ]);
  });
});
