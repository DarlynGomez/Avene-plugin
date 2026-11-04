import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CalendarStateMessage } from "../../shared/calendar/calendarMessages";
import { DEFAULT_SETTINGS } from "../../shared/calendar/settings";
import { participantVisibility } from "../../shared/study/participantVisibility";
import type { StudySession } from "../../shared/study/studyTypes";
import { StudyStateContext } from "../study/StudyStateContext";
import { CalendarProvider } from "./CalendarProvider";
import { useCalendar, type CalendarValue } from "./CalendarContext";

vi.mock("../../shared/calendarFlags", async (original) => ({
  ...(await original<typeof import("../../shared/calendarFlags")>()),
  FEATURE_CALENDAR: true
}));

const SIG = "#9CB5B1|#FFFFFF|sage/muted|4.5";
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

let posted: { type: string; [key: string]: unknown }[];
let value: CalendarValue;

function Probe() {
  value = useCalendar();
  return <p>{value.available ? "on" : "off"}</p>;
}

function mount(session: StudySession | null = null) {
  const study = session
    ? {
        type: "STUDY_STATE" as const,
        session,
        visibility: participantVisibility(session),
        refusal: null
      }
    : null;
  render(
    <StudyStateContext.Provider value={study}>
      <CalendarProvider>
        <Probe />
      </CalendarProvider>
    </StudyStateContext.Provider>
  );
}

const state = (
  counts: Record<string, number>,
  over: Partial<CalendarStateMessage> = {}
): CalendarStateMessage => ({
  type: "CALENDAR_STATE",
  settings: DEFAULT_SETTINGS,
  counts,
  userName: "Darlyn Gomez",
  fileUrl: null,
  ...over
});
const emit = (message: unknown) =>
  act(
    () =>
      void window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }))
  );

beforeEach(() => {
  posted = [];
  vi.spyOn(window.parent, "postMessage").mockImplementation((message: unknown) => {
    posted.push((message as { pluginMessage: (typeof posted)[number] }).pluginMessage);
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("with the calendar on", () => {
  it("asks for the state and takes what comes back", () => {
    mount();
    expect(posted[0]).toEqual({ type: "CALENDAR_STATE_REQUEST", live: [] });
    emit(state({ [SIG]: 1 }));
    expect(value.userName).toBe("Darlyn Gomez");
    expect(value.counts).toEqual({ [SIG]: 1 });
    expect(value.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("offers time only when a deferral reaches the trigger", () => {
    mount();
    emit(state({}));
    act(() => value.noteDeferred(SIG));
    expect(posted.at(-1)).toEqual({ type: "CALENDAR_DEFERRED", signature: SIG });
    emit(state({ [SIG]: 2 }));
    expect(value.pending).toBeNull();
    act(() => value.noteDeferred(SIG));
    emit(state({ [SIG]: 3 }));
    expect(value.pending).toBe(SIG);
  });

  it("does not offer time for a state that no deferral asked for", () => {
    mount();
    emit(state({ [SIG]: 9 }));
    expect(value.pending).toBeNull();
  });

  it("follows the trigger the designer chose, and never offers when it is off", () => {
    mount();
    act(() => value.noteDeferred(SIG));
    emit(state({ [SIG]: 3 }, { settings: { ...DEFAULT_SETTINGS, trigger: 5 } }));
    expect(value.pending).toBeNull();
    act(() => value.noteDeferred(SIG));
    emit(state({ [SIG]: 9 }, { settings: { ...DEFAULT_SETTINGS, trigger: "off" } }));
    expect(value.pending).toBeNull();
  });

  it("clears the offer on dismiss and when roots were scheduled, and can open one by hand", () => {
    mount();
    act(() => value.openFor(SIG));
    expect(value.pending).toBe(SIG);
    act(() => value.dismiss());
    expect(value.pending).toBeNull();
    act(() => value.openFor(SIG));
    act(() => value.scheduled([SIG]));
    expect(value.pending).toBeNull();
    expect(posted.at(-1)).toEqual({ type: "CALENDAR_SCHEDULED", signatures: [SIG] });
  });

  it("sends settings, a reset, a state request with live roots and a link to open", () => {
    mount();
    emit(state({}));
    act(() => value.saveSettings({ ...DEFAULT_SETTINGS, trigger: 5 }));
    expect(posted.at(-1)).toMatchObject({
      type: "CALENDAR_SETTINGS_SET",
      settings: { trigger: 5 }
    });
    expect(value.settings.trigger).toBe(5);
    act(() => value.reset());
    expect(posted.at(-1)).toEqual({ type: "CALENDAR_RESET" });
    act(() => value.requestState([SIG]));
    expect(posted.at(-1)).toEqual({ type: "CALENDAR_STATE_REQUEST", live: [SIG] });
    act(() => value.openUrl("https://calendar.google.com/calendar/render?x=1"));
    expect(posted.at(-1)).toMatchObject({ type: "CALENDAR_OPEN_URL" });
  });

  it("opens and closes the settings screen", () => {
    mount();
    expect(value.settingsOpen).toBe(false);
    act(() => value.openSettings());
    expect(value.settingsOpen).toBe(true);
    act(() => value.closeSettings());
    expect(value.settingsOpen).toBe(false);
  });

  it("ignores messages that are not about the calendar", () => {
    mount();
    emit({ type: "HANDOFF_REFUSED" });
    emit({ type: "CALENDAR_REFUSED" });
    emit(null);
    expect(value.counts).toEqual({});
  });
});

describe("during a study session", () => {
  it("is off, sends nothing and never offers time", () => {
    mount(SESSION);
    expect(screen.getByText("off")).toBeInTheDocument();
    act(() => value.noteDeferred(SIG));
    act(() => value.saveSettings(DEFAULT_SETTINGS));
    act(() => value.reset());
    act(() => value.openUrl("https://calendar.google.com/calendar/render?x=1"));
    act(() => value.requestState([SIG]));
    expect(posted).toEqual([]);
    emit(state({ [SIG]: 9 }));
    expect(value.pending).toBeNull();
    expect(value.counts).toEqual({});
  });

  it("comes back after the researcher exits study mode", () => {
    mount({ ...SESSION, phase: "ended", exitedAt: "t" });
    expect(screen.getByText("on")).toBeInTheDocument();
  });
});
