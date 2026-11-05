import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AnnotationPluginMessage,
  AnnotationUiMessage
} from "../../shared/handoff/alt/annotationMessages";
import type { StudySession } from "../../shared/study/studyTypes";
import { altNote, giveNote, installFake } from "../handoff/adapter/annotationHarness";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { emitStudy } from "../study/adapter/studyEmitter";
import { handleAnnotationMessage } from "./annotationProtocol";
import { handleExplanationOrRole, isExplanationOrRole } from "./otherProtocols";

vi.mock("../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../shared/handoffFlags")>()),
  FEATURE_HANDOFF: true,
  FEATURE_ALT_ANNOTATIONS: true
}));
vi.mock("../study/adapter/studySessionStore", async (original) => ({
  ...(await original<typeof import("../study/adapter/studySessionStore")>()),
  activeStudySession: vi.fn()
}));
vi.mock("../study/adapter/studyEmitter", () => ({ emitStudy: vi.fn() }));

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
const ALL: AnnotationUiMessage[] = [
  { type: "HANDOFF_ANNOTATE", nodeId: "1:1" },
  { type: "HANDOFF_ANNOTATION_UPDATE", nodeId: "1:1" },
  { type: "HANDOFF_ANNOTATION_REMOVE", nodeId: "1:1" },
  { type: "HANDOFF_ANNOTATION_STATUS_REQUEST", nodeIds: ["1:1"] }
];

let fake: ReturnType<typeof installFake>;
let replies: AnnotationPluginMessage[];
const run = (message: AnnotationUiMessage) =>
  handleAnnotationMessage(message, (r) => replies.push(r));

beforeEach(() => {
  fake = installFake();
  giveNote(fake.addNode("1:1", []), altNote("A cafe sign"));
  replies = [];
  vi.mocked(activeStudySession).mockReturnValue(null);
  vi.mocked(emitStudy).mockClear();
  fake.calls.length = 0;
});
afterEach(() => vi.unstubAllGlobals());

describe("while a study session is active", () => {
  beforeEach(() => vi.mocked(activeStudySession).mockReturnValue(SESSION));

  it.each(ALL.map((message) => [message.type, message] as const))(
    "refuses %s with a typed reply, no read and no write",
    async (_name, message) => {
      const nodeLookup = vi.spyOn(figma, "getNodeByIdAsync");
      await run(message);
      expect(replies).toEqual([{ type: "HANDOFF_ANNOTATION_REFUSED" }]);
      expect(nodeLookup).not.toHaveBeenCalled();
      expect(fake.calls).toEqual([]);
      expect(fake.commitUndo).not.toHaveBeenCalled();
    }
  );
});

describe("with no study session", () => {
  it("annotates, reports the status, and removes, one layer at a time", async () => {
    await run(ALL[0]);
    await run(ALL[3]);
    await run(ALL[2]);
    expect(replies).toEqual([
      {
        type: "HANDOFF_ANNOTATION_RESULT",
        action: "annotate",
        nodeId: "1:1",
        ok: true,
        status: "in-sync"
      },
      { type: "HANDOFF_ANNOTATION_STATUSES", statuses: { "1:1": "in-sync" } },
      {
        type: "HANDOFF_ANNOTATION_RESULT",
        action: "remove",
        nodeId: "1:1",
        ok: true,
        status: "none"
      }
    ]);
  });

  it("emits nothing to the study log", async () => {
    for (const message of ALL) await run(message);
    expect(emitStudy).not.toHaveBeenCalled();
  });

  it("is picked up by the shared router and answered", async () => {
    expect(isExplanationOrRole(ALL[0] as unknown as Record<string, unknown>)).toBe(true);
    await handleExplanationOrRole(ALL[3] as unknown as Record<string, unknown>, (r) =>
      replies.push(r as AnnotationPluginMessage)
    );
    expect(replies[0]).toMatchObject({ type: "HANDOFF_ANNOTATION_STATUSES" });
  });

  it("does not answer a message that is not one of its own", async () => {
    expect(isExplanationOrRole({ type: "HANDOFF_ANNOTATE_ALL" })).toBe(false);
  });
});
