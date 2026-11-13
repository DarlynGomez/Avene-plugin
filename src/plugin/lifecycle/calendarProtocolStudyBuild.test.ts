import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CalendarPluginMessage } from "../../shared/calendar/calendarMessages";
import { googleCalendarUrl } from "../../shared/calendar/googleUrl";
import { buildTree } from "../roles/testing/fakeFigma";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { handleCalendarMessage } from "./calendarProtocol";

vi.mock("../../shared/calendarFlags", async (original) => ({
  ...(await original<typeof import("../../shared/calendarFlags")>()),
  FEATURE_CALENDAR: true
}));
vi.mock("../study/adapter/studySessionStore", async (original) => ({
  ...(await original<typeof import("../study/adapter/studySessionStore")>()),
  activeStudySession: vi.fn()
}));
vi.mock("../study/adapter/studyEmitter", () => ({ emitStudy: vi.fn() }));

let opened: ReturnType<typeof vi.fn>;
let replies: CalendarPluginMessage[];

beforeEach(() => {
  buildTree();
  opened = vi.fn();
  replies = [];
  Object.assign(figma, {
    openExternal: opened,
    currentUser: { name: "Test User" },
    clientStorage: { getAsync: vi.fn(() => Promise.resolve(undefined)), setAsync: vi.fn() }
  });
  vi.mocked(activeStudySession).mockReturnValue(null);
});

describe("in the study build, which is what a plain run is", () => {
  it("never opens a Google Calendar address, even a well formed one, with no study session running", async () => {
    const url = googleCalendarUrl({
      title: "T",
      body: "B",
      start: new Date(2026, 10, 3, 10),
      end: new Date(2026, 10, 3, 11),
      link: null
    });
    await handleCalendarMessage({ type: "CALENDAR_OPEN_URL", url }, (r) => replies.push(r));
    expect(opened).not.toHaveBeenCalled();
  });
});
