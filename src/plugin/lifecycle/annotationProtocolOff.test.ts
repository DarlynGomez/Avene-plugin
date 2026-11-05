import { afterEach, describe, expect, it, vi } from "vitest";

import { FEATURE_ALT_ANNOTATIONS } from "../../shared/handoffFlags";
import { altNote, giveNote, installFake } from "../handoff/adapter/annotationHarness";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { handleAnnotationMessage } from "./annotationProtocol";

vi.mock("../study/adapter/studySessionStore", async (original) => ({
  ...(await original<typeof import("../study/adapter/studySessionStore")>()),
  activeStudySession: vi.fn(() => null)
}));

afterEach(() => vi.unstubAllGlobals());

describe("annotations with the committed flag", () => {
  it("is off, so every message is refused before anything is read, even with handoff on", async () => {
    expect(FEATURE_ALT_ANNOTATIONS).toBe(false);
    const fake = installFake();
    giveNote(fake.addNode("1:1", []), altNote("A cafe sign"));
    fake.calls.length = 0;
    const lookup = vi.spyOn(figma, "getNodeByIdAsync");
    const replies: unknown[] = [];
    await handleAnnotationMessage({ type: "HANDOFF_ANNOTATE", nodeId: "1:1" }, (r) =>
      replies.push(r)
    );
    await handleAnnotationMessage(
      { type: "HANDOFF_ANNOTATION_STATUS_REQUEST", nodeIds: ["1:1"] },
      (r) => replies.push(r)
    );
    expect(replies).toEqual([
      { type: "HANDOFF_ANNOTATION_REFUSED" },
      { type: "HANDOFF_ANNOTATION_REFUSED" }
    ]);
    expect(lookup).not.toHaveBeenCalled();
    expect(activeStudySession).not.toHaveBeenCalled();
    expect(fake.calls).toEqual([]);
  });
});
