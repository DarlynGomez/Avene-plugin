import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudySession } from "../../shared/study/studyTypes";
import { installFake } from "../handoff/adapter/annotationHarness";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { emitStudy } from "../study/adapter/studyEmitter";
import { handledTypes, messageOf, VALID } from "./gateAuditMessages";
import { handleExplanationOrRole, isExplanationOrRole } from "./otherProtocols";

// Every handoff flag on, so the only thing that can switch the feature off is the study
vi.mock("../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../shared/handoffFlags")>()),
  FEATURE_HANDOFF: true,
  FEATURE_ALT_ANNOTATIONS: true,
  FEATURE_ALT_SUGGEST_LIVE: true
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

let fake: ReturnType<typeof installFake>;
let rootGets: ReturnType<typeof vi.fn>;
let rootSets: ReturnType<typeof vi.fn>;
let nodeLookup: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fake = installFake();
  fake.addNode("1:1", []);
  rootGets = vi.fn(() => "");
  rootSets = vi.fn();
  Object.assign(figma.root, { getPluginData: rootGets, setPluginData: rootSets });
  nodeLookup = vi.spyOn(figma, "getNodeByIdAsync") as unknown as ReturnType<typeof vi.fn>;
  fake.calls.length = 0;
  vi.mocked(emitStudy).mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe("the audit covers every message the sandbox answers", () => {
  it("has a valid message for each type the handlers switch on, and none that is not handled", () => {
    const handled = handledTypes();
    expect(handled.length).toBeGreaterThanOrEqual(14);
    expect([...handled].sort()).toEqual(Object.keys(VALID).sort());
  });
});

describe("while a study session is active", () => {
  beforeEach(() => vi.mocked(activeStudySession).mockReturnValue(SESSION));

  it.each(Object.keys(VALID))("%s is routed, refused, and touches nothing", async (type) => {
    const message = messageOf(type);
    expect(isExplanationOrRole(message)).toBe(true);
    const replies: { type: string }[] = [];
    await handleExplanationOrRole(message, (reply) => replies.push(reply as { type: string }));
    expect(replies).toHaveLength(1);
    expect(["HANDOFF_REFUSED", "HANDOFF_ANNOTATION_REFUSED"]).toContain(replies[0].type);
    expect(rootGets).not.toHaveBeenCalled();
    expect(rootSets).not.toHaveBeenCalled();
    expect(nodeLookup).not.toHaveBeenCalled();
    expect(fake.calls).toEqual([]);
    expect(fake.commitUndo).not.toHaveBeenCalled();
    expect(emitStudy).not.toHaveBeenCalled();
  });

  it("still refuses once the block has ended, until the researcher exits", async () => {
    vi.mocked(activeStudySession).mockReturnValue({ ...SESSION, phase: "ended" });
    for (const type of Object.keys(VALID)) {
      const replies: { type: string }[] = [];
      await handleExplanationOrRole(messageOf(type), (reply) =>
        replies.push(reply as { type: string })
      );
      expect(replies[0].type, type).toMatch(/REFUSED$/);
    }
    expect(rootSets).not.toHaveBeenCalled();
  });
});

describe("with no study session, so the refusal above is the study and not a bug", () => {
  it("answers a read and does not refuse it", async () => {
    vi.mocked(activeStudySession).mockReturnValue(null);
    const replies: { type: string }[] = [];
    await handleExplanationOrRole(messageOf("HANDOFF_ALT_CACHE_REQUEST"), (r) =>
      replies.push(r as { type: string })
    );
    expect(replies[0].type).toBe("HANDOFF_ALT_CACHE");
  });
});
