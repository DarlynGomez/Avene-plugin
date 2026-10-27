import { afterEach, describe, expect, it, vi } from "vitest";

import { FEATURE_HANDOFF } from "../../shared/handoffFlags";
import { buildTree } from "../roles/testing/fakeFigma";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { handleHandoffMessage } from "./handoffProtocol";

vi.mock("../study/adapter/studySessionStore", async (original) => ({
  ...(await original<typeof import("../study/adapter/studySessionStore")>()),
  activeStudySession: vi.fn(() => null)
}));

afterEach(() => vi.unstubAllGlobals());

describe("handoff with the committed flag", () => {
  it("is off, so every message is refused before any storage or session is read", async () => {
    expect(FEATURE_HANDOFF).toBe(false);
    buildTree();
    const sets = vi.fn();
    const gets = vi.fn(() => "");
    Object.assign(figma.root, { getPluginData: gets, setPluginData: sets });
    const replies: unknown[] = [];
    await handleHandoffMessage({ type: "HANDOFF_DATA_REQUEST" }, (reply) => replies.push(reply));
    await handleHandoffMessage({ type: "HANDOFF_FILE_URL_SET", url: "" }, (reply) =>
      replies.push(reply)
    );
    expect(replies).toEqual([{ type: "HANDOFF_REFUSED" }, { type: "HANDOFF_REFUSED" }]);
    expect(gets).not.toHaveBeenCalled();
    expect(sets).not.toHaveBeenCalled();
    expect(activeStudySession).not.toHaveBeenCalled();
  });
});
