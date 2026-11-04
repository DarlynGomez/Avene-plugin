import { afterEach, describe, expect, it, vi } from "vitest";

import { buildTree } from "../roles/testing/fakeFigma";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { handleCalendarMessage } from "./calendarProtocol";

vi.mock("../../shared/calendarFlags", async (original) => ({
  ...(await original<typeof import("../../shared/calendarFlags")>()),
  FEATURE_CALENDAR: false
}));

vi.mock("../study/adapter/studySessionStore", async (original) => ({
  ...(await original<typeof import("../study/adapter/studySessionStore")>()),
  activeStudySession: vi.fn(() => null)
}));

afterEach(() => vi.unstubAllGlobals());

describe("calendar with the flag off", () => {
  it("is off, so every message is refused before any storage or session is read", async () => {
    buildTree();
    const sets = vi.fn();
    const gets = vi.fn(() => "");
    Object.assign(figma.root, { getPluginData: gets, setPluginData: sets });
    const replies: unknown[] = [];
    await handleCalendarMessage({ type: "CALENDAR_RESET" }, (reply) => replies.push(reply));
    await handleCalendarMessage({ type: "CALENDAR_DEFERRED", signature: "a|b" }, (reply) =>
      replies.push(reply)
    );
    expect(replies).toEqual([{ type: "CALENDAR_REFUSED" }, { type: "CALENDAR_REFUSED" }]);
    expect(gets).not.toHaveBeenCalled();
    expect(sets).not.toHaveBeenCalled();
    expect(activeStudySession).not.toHaveBeenCalled();
  });
});
