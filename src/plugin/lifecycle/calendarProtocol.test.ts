import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CalendarPluginMessage,
  CalendarUiMessage
} from "../../shared/calendar/calendarMessages";
import { googleCalendarUrl } from "../../shared/calendar/googleUrl";
import { DEFAULT_SETTINGS } from "../../shared/calendar/settings";
import type { StudySession } from "../../shared/study/studyTypes";
import { KEY_DEFERRALS } from "../calendar/calendarKeys";
import { buildTree } from "../roles/testing/fakeFigma";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { emitStudy } from "../study/adapter/studyEmitter";
import { handleCalendarMessage } from "./calendarProtocol";
import { handleExplanationOrRole, isExplanationOrRole } from "./otherProtocols";

vi.mock("../../shared/calendarFlags", async (original) => ({
  ...(await original<typeof import("../../shared/calendarFlags")>()),
  FEATURE_CALENDAR: true
}));
vi.mock("../study/adapter/studySessionStore", async (original) => ({
  ...(await original<typeof import("../study/adapter/studySessionStore")>()),
  activeStudySession: vi.fn()
}));
vi.mock("../study/adapter/studyEmitter", () => ({ emitStudy: vi.fn() }));

const SIG = "#9CB5B1|#FFFFFF|sage/muted|4.5";
const OTHER = "#777777|#FFFFFF|unbound|4.5";
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
const ALL: CalendarUiMessage[] = [
  { type: "CALENDAR_STATE_REQUEST", live: [SIG] },
  { type: "CALENDAR_DEFERRED", signature: SIG },
  { type: "CALENDAR_SCHEDULED", signatures: [SIG] },
  { type: "CALENDAR_SETTINGS_SET", settings: DEFAULT_SETTINGS },
  { type: "CALENDAR_OPEN_URL", url: "https://calendar.google.com/calendar/render?action=TEMPLATE" },
  { type: "CALENDAR_RESET" }
];

let gets: ReturnType<typeof vi.fn>;
let sets: ReturnType<typeof vi.fn>;
let opened: ReturnType<typeof vi.fn>;
let user: Map<string, unknown>;
let replies: CalendarPluginMessage[];

function setup() {
  buildTree();
  const root = figma.root as unknown as {
    getPluginData: (k: string) => string;
    setPluginData: (k: string, v: string) => void;
  };
  gets = vi.fn(root.getPluginData);
  sets = vi.fn(root.setPluginData);
  root.getPluginData = gets as never;
  root.setPluginData = sets as never;
  opened = vi.fn();
  user = new Map();
  Object.assign(figma, {
    openExternal: opened,
    currentUser: { name: "Darlyn Gomez" },
    clientStorage: {
      getAsync: vi.fn((k: string) => Promise.resolve(user.get(k))),
      setAsync: vi.fn((k: string, v: unknown) => Promise.resolve(void user.set(k, v)))
    }
  });
}

async function run(message: CalendarUiMessage) {
  await handleCalendarMessage(message, (reply) => replies.push(reply));
}

const last = () => replies.at(-1) as Extract<CalendarPluginMessage, { type: "CALENDAR_STATE" }>;

beforeEach(() => {
  setup();
  replies = [];
  vi.mocked(activeStudySession).mockReturnValue(null);
  vi.mocked(emitStudy).mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe("while a study session is active", () => {
  beforeEach(() => vi.mocked(activeStudySession).mockReturnValue(SESSION));

  it.each(ALL.map((m) => [m.type, m] as const))(
    "refuses %s with no read, no write and no link opened",
    async (_n, message) => {
      await run(message);
      expect(replies).toEqual([{ type: "CALENDAR_REFUSED" }]);
      expect(gets).not.toHaveBeenCalled();
      expect(sets).not.toHaveBeenCalled();
      expect(opened).not.toHaveBeenCalled();
      expect(user.size).toBe(0);
    }
  );

  it("still refuses once the block has ended, until the researcher exits", async () => {
    vi.mocked(activeStudySession).mockReturnValue({ ...SESSION, phase: "ended" });
    await run(ALL[0]);
    expect(replies).toEqual([{ type: "CALENDAR_REFUSED" }]);
  });
});

describe("with no study session", () => {
  it("answers a state request with the settings, counts, name and file address", async () => {
    await run({ type: "CALENDAR_STATE_REQUEST", live: [] });
    expect(last()).toEqual({
      type: "CALENDAR_STATE",
      settings: DEFAULT_SETTINGS,
      counts: {},
      userName: "Darlyn Gomez",
      fileUrl: null
    });
  });

  it("counts each deferral of a root alone", async () => {
    await run({ type: "CALENDAR_DEFERRED", signature: SIG });
    await run({ type: "CALENDAR_DEFERRED", signature: SIG });
    await run({ type: "CALENDAR_DEFERRED", signature: OTHER });
    expect(last().counts).toEqual({ [SIG]: 2, [OTHER]: 1 });
  });

  it("drops the counts of roots that are gone, and keeps all of them when the panel has loaded nothing", async () => {
    await run({ type: "CALENDAR_DEFERRED", signature: SIG });
    await run({ type: "CALENDAR_DEFERRED", signature: OTHER });
    await run({ type: "CALENDAR_STATE_REQUEST", live: [] });
    expect(Object.keys(last().counts)).toHaveLength(2);
    await run({ type: "CALENDAR_STATE_REQUEST", live: [OTHER] });
    expect(Object.keys(last().counts)).toEqual([OTHER]);
  });

  it("starts the count again for roots that were scheduled, and clears everything on a reset", async () => {
    await run({ type: "CALENDAR_DEFERRED", signature: SIG });
    await run({ type: "CALENDAR_DEFERRED", signature: OTHER });
    await run({ type: "CALENDAR_SCHEDULED", signatures: [SIG] });
    expect(last().counts).toEqual({ [OTHER]: 1 });
    await run({ type: "CALENDAR_RESET" });
    expect(last().counts).toEqual({});
    expect(figma.root.getPluginData(KEY_DEFERRALS)).toBe("");
  });

  it("saves settings for the user, made safe, and sends them back", async () => {
    await run({
      type: "CALENDAR_SETTINGS_SET",
      settings: { ...DEFAULT_SETTINGS, trigger: 5, minutes: 30 }
    });
    expect(last().settings).toMatchObject({ trigger: 5, minutes: 30 });
    await run({ type: "CALENDAR_SETTINGS_SET", settings: { trigger: 99 } as never });
    expect(last().settings).toEqual({ ...DEFAULT_SETTINGS, trigger: 3 });
  });

  it("opens the calendar address in the browser and nothing else", async () => {
    const url = googleCalendarUrl({
      title: "T",
      body: "B",
      start: new Date(2026, 10, 3, 10),
      end: new Date(2026, 10, 3, 11),
      link: null
    });
    await run({ type: "CALENDAR_OPEN_URL", url });
    expect(opened).toHaveBeenCalledWith(url);
    for (const bad of [
      "https://evil.example/",
      "https://calendar.google.com/calendar/other?x=1",
      "javascript:alert(1)",
      ""
    ]) {
      await run({ type: "CALENDAR_OPEN_URL", url: bad });
    }
    expect(opened).toHaveBeenCalledTimes(1);
  });

  it("writes no study event on any path", async () => {
    for (const message of ALL) await run(message);
    expect(emitStudy).not.toHaveBeenCalled();
    const keys = sets.mock.calls.map(([key]) => String(key));
    expect(keys.filter((key) => key.startsWith("cadt.study"))).toEqual([]);
  });

  it("is picked up by the shared router", async () => {
    expect(isExplanationOrRole({ type: "CALENDAR_RESET" })).toBe(true);
    expect(isExplanationOrRole({ type: "CALENDAR_DEFERRED" })).toBe(false);
    await handleExplanationOrRole({ type: "CALENDAR_RESET" }, (reply) =>
      replies.push(reply as CalendarPluginMessage)
    );
    expect(replies[0].type).toBe("CALENDAR_STATE");
  });
});
