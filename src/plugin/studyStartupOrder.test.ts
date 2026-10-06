import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEY_STUDY_SESSION } from "./storage/storageKeys";

type Posted = { type?: string; pluginMessage?: unknown };

const posted: Posted[] = [];
const ui: {
  onmessage: ((message: unknown) => Promise<void> | void) | null;
  postMessage: (m: Posted) => void;
} = {
  onmessage: null,
  postMessage: (message) => void posted.push(message)
};
let data: Map<string, string>;

function stubFigma() {
  ui.onmessage = null;
  vi.stubGlobal("__html__", "<html></html>");
  vi.stubGlobal("figma", {
    command: "open",
    root: { getPluginData: (key: string) => data.get(key) ?? "", setPluginData: vi.fn() },
    clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
    ui,
    showUI: vi.fn(),
    notify: vi.fn(),
    closePlugin: vi.fn(),
    loadAllPagesAsync: async () => undefined,
    on: vi.fn(),
    currentPage: { findAllWithCriteria: () => [{ id: "1:1" }], selection: [] },
    getNodeByIdAsync: async () => null,
    viewport: { scrollAndZoomIntoView: vi.fn() }
  });
}

beforeEach(() => {
  vi.resetModules();
  posted.length = 0;
  data = new Map();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("study state ordering at startup", () => {
  it("sends STUDY_STATE as the first message, with no envelope", async () => {
    stubFigma();
    await import("./main");

    expect(posted[0]).toMatchObject({ type: "STUDY_STATE", session: null });
    expect(posted[0]).not.toHaveProperty("pluginMessage");
  });

  it("sends STUDY_STATE before any ISSUES_UPDATED reaches the UI", async () => {
    stubFigma();
    await import("./main");
    await vi.waitFor(() => expect(posted.some((m) => m.type === "ISSUES_UPDATED")).toBe(true));

    const types = posted.map((m) => m.type);
    expect(types.indexOf("STUDY_STATE")).toBeLessThan(types.indexOf("ISSUES_UPDATED"));
  });

  it("sends the stored session first when the file is in a study block", async () => {
    stubFigma();
    data.set(
      STORAGE_KEY_STUDY_SESSION,
      JSON.stringify({
        schemaVersion: 1,
        participantId: "P01",
        block: 1,
        task: "A",
        condition: "post-task",
        consentConfirmedAt: "t",
        phase: "designing",
        startedAt: "t",
        revealedAt: null,
        endedAt: null,
        exports: [],
        exitedAt: null
      })
    );
    await import("./main");

    expect(posted[0]).toMatchObject({
      type: "STUDY_STATE",
      session: { phase: "designing" },
      visibility: { issueList: false }
    });
  });

  it("answers ISSUES_SUBSCRIBE with STUDY_STATE and then ISSUES_UPDATED", async () => {
    stubFigma();
    await import("./main");
    await vi.waitFor(() => expect(posted.some((m) => m.type === "ISSUES_UPDATED")).toBe(true));
    posted.length = 0;

    await ui.onmessage?.({ type: "ISSUES_SUBSCRIBE" });

    expect(posted.map((m) => m.type)).toEqual(["STUDY_STATE", "ISSUES_UPDATED"]);
  });

  it("routes a study message from the UI and replies with STUDY_STATE", async () => {
    stubFigma();
    await import("./main");
    await vi.waitFor(() => expect(posted.length).toBeGreaterThan(0));
    posted.length = 0;

    await ui.onmessage?.({ type: "STUDY_REVEAL" });

    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ type: "STUDY_STATE", refusal: { code: "no-session" } });
  });

  it("drops a malformed study message without replying", async () => {
    stubFigma();
    await import("./main");
    await vi.waitFor(() => expect(posted.length).toBeGreaterThan(0));
    posted.length = 0;

    await ui.onmessage?.({ type: "STUDY_START_BLOCK", participantId: 5 });

    expect(posted).toHaveLength(0);
  });
});
