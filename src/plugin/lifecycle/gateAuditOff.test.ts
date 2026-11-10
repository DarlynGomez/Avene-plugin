import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installFake } from "../handoff/adapter/annotationHarness";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { emitStudy } from "../study/adapter/studyEmitter";
import { handledTypes, messageOf, VALID } from "./gateAuditMessages";
import { handleExplanationOrRole } from "./otherProtocols";

// Handoff is off, and the annotation flag is on, which must still not let anything through
vi.mock("../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../shared/handoffFlags")>()),
  FEATURE_HANDOFF: false,
  FEATURE_ALT_ANNOTATIONS: true,
  FEATURE_ALT_SUGGEST_LIVE: true
}));
vi.mock("../study/adapter/studySessionStore", async (original) => ({
  ...(await original<typeof import("../study/adapter/studySessionStore")>()),
  activeStudySession: vi.fn(() => null)
}));
vi.mock("../study/adapter/studyEmitter", () => ({ emitStudy: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

describe("with handoff off", () => {
  let fake: ReturnType<typeof installFake>;
  let gets: ReturnType<typeof vi.fn>;
  let sets: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fake = installFake();
    fake.addNode("1:1", []);
    gets = vi.fn(() => "");
    sets = vi.fn();
    Object.assign(figma.root, { getPluginData: gets, setPluginData: sets });
    fake.calls.length = 0;
  });

  it.each(Object.keys(VALID))(
    "%s is refused before anything is read, even with the annotation flag on",
    async (type) => {
      const lookup = vi.spyOn(figma, "getNodeByIdAsync");
      const replies: { type: string }[] = [];
      await handleExplanationOrRole(messageOf(type), (reply) =>
        replies.push(reply as { type: string })
      );
      expect(replies[0].type).toMatch(/REFUSED$/);
      expect(gets).not.toHaveBeenCalled();
      expect(sets).not.toHaveBeenCalled();
      expect(lookup).not.toHaveBeenCalled();
      expect(activeStudySession).not.toHaveBeenCalled();
      expect(fake.calls).toEqual([]);
      expect(emitStudy).not.toHaveBeenCalled();
    }
  );

  it("covers every handled type", () => {
    expect([...handledTypes()].sort()).toEqual(Object.keys(VALID).sort());
  });
});
