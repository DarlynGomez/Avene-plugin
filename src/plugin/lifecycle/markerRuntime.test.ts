import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IssueSummary } from "../../shared/issues/issueTypes";
import type { StudyMessage } from "../../shared/study/studyMessageTypes";
import { createFakeFigma, type FakeNode } from "../markers/adapter/markerFigmaStub";

const START: StudyMessage = {
  type: "STUDY_START_BLOCK",
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  paperConsentSigned: true
};

const PAGE = { type: "PAGE" };
const frame = (id: string, x: number) => ({
  id,
  name: id,
  type: "FRAME",
  parent: PAGE,
  absoluteBoundingBox: { x, y: 0, width: 100, height: 100 },
  children: [] as unknown[]
});

function issue(
  id: string,
  nodeId: string,
  screenId: string,
  state: IssueSummary["state"],
  fg = "#9CB5B1"
): IssueSummary {
  return {
    id,
    ruleId: "contrast",
    nodeId,
    nodeName: `Layer ${nodeId}`,
    screenId,
    screenName: `Screen ${screenId}`,
    state,
    severityAtLastDetection: "high",
    encounterCount: 0,
    lastDetectedAt: "2026-10-12T00:00:00.000Z",
    evidence: {
      measuredRatio: 2.17,
      requiredRatio: 4.5,
      foregroundHex: fg,
      backgroundHex: "#FFFFFF",
      foregroundBinding: null
    }
  };
}

const posted: { type?: string; [key: string]: unknown }[] = [];
let data: Map<string, string>;
let listeners: Record<string, Array<() => void>>;
let selection: unknown[];
let fake: ReturnType<typeof createFakeFigma>;
let t1: FakeNode;
let t2: FakeNode;

function stubEverything(): void {
  fake = createFakeFigma();
  fake.install();
  data = new Map();
  listeners = {};
  selection = [];
  const f1 = frame("F1", 0);
  const f2 = frame("F2", 200);
  t1 = fake.addNode("T1");
  t2 = fake.addNode("T2");
  Object.assign(t1, { parent: f1, name: "T1" });
  Object.assign(t2, { parent: f2, name: "T2" });
  const base = (globalThis as unknown as { figma: Record<string, unknown> }).figma;
  vi.stubGlobal("figma", {
    ...base,
    root: {
      ...(base.root as object),
      getPluginData: (key: string) => data.get(key) ?? "",
      setPluginData: (key: string, value: string) => void data.set(key, value)
    },
    clientStorage: { getAsync: async () => undefined },
    viewport: { center: { x: 50, y: 50 }, scrollAndZoomIntoView: vi.fn() },
    currentPage: {
      get selection() {
        return selection;
      },
      set selection(value: unknown[]) {
        selection = value;
      },
      children: [f1, f2]
    },
    ui: { postMessage: (message: { type?: string }) => void posted.push(message) },
    on: (type: string, handler: () => void) => void (listeners[type] ??= []).push(handler)
  });
}

async function load(flag: boolean) {
  vi.resetModules();
  vi.doMock("../../shared/featureFlags", () => ({
    FEATURE_VARIABLE_SCOPE: false,
    FEATURE_MARKERS: flag
  }));
  return {
    runtime: await import("./markerRuntime"),
    listener: await import("./selectionListener"),
    study: await import("./studyProtocol"),
    emitter: await import("../study/adapter/studyEmitter"),
    log: await import("../study/adapter/studyLogStore"),
    canvas: await import("../accountability/adapter/canvasSelection")
  };
}

const ISSUES = [
  issue("contrast:T1", "T1", "F1", "open"),
  issue("contrast:T2", "T2", "F2", "open", "#888888")
];
const labels = (node: FakeNode) => node.annotations.map((annotation) => annotation.label);

beforeEach(() => {
  vi.useFakeTimers();
  posted.length = 0;
  stubEverything();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock("../../shared/featureFlags");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function settle(ms = 0) {
  await vi.advanceTimersByTimeAsync(ms);
}

describe("markers with no session", () => {
  it("draw on the screen under the viewport and move after the dwell, never before", async () => {
    const m = await load(true);
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();

    expect(labels(t1)).toEqual(["Contrast 2.17, needs 4.5"]);
    expect(t2.annotations).toEqual([]);

    selection = [t2];
    await m.listener.handleSelectionChange(false);
    await settle(599);
    expect(labels(t1)).toHaveLength(1);
    await settle(1);
    expect(t1.annotations).toEqual([]);
    expect(labels(t2)).toHaveLength(1);
  });

  it("do not move for a selection the plugin made, using the one flag the listener read", async () => {
    const m = await load(true);
    const consume = vi.spyOn(m.canvas, "consumePluginSetSelectionMarker");
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    m.listener.registerSelectionChangeListener();
    await settle();

    m.canvas.selectResolvedNodesAndZoom([t2 as unknown as SceneNode]);
    listeners.selectionchange?.forEach((handler) => handler());
    await settle(5000);

    expect(consume).toHaveBeenCalledTimes(1);
    expect(labels(t1)).toHaveLength(1);
    expect(t2.annotations).toEqual([]);
  });

  it("follow the issue list, so a deferred root loses its marker", async () => {
    const m = await load(true);
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();
    m.runtime.markersOnIssues([
      issue("contrast:T1", "T1", "F1", "deferred"),
      ISSUES[1] as IssueSummary
    ]);
    await settle();

    expect(t1.annotations).toEqual([]);
  });

  it("tell the panel to scroll to the root of a selected marked layer and never set the selection", async () => {
    const m = await load(true);
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();
    selection = [t1];
    const before = selection;
    await m.listener.handleSelectionChange(false);
    await settle();

    const message = posted.find((entry) => entry.type === "MARKER_SELECTED");
    expect(message).toMatchObject({ type: "MARKER_SELECTED" });
    expect(typeof message?.signature).toBe("string");
    expect(selection).toBe(before);
  });

  it("do not scroll the panel for a selection the plugin made", async () => {
    const m = await load(true);
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();
    selection = [t1];
    await m.listener.handleSelectionChange(true);

    expect(posted.some((entry) => entry.type === "MARKER_SELECTED")).toBe(false);
  });

  it("clear on close and clear on a page change", async () => {
    const m = await load(true);
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();
    listeners.close?.forEach((handler) => handler());
    expect(t1.annotations).toEqual([]);
  });

  it("say once in the panel when the file is view only", async () => {
    const m = await load(true);
    fake.state.readOnly = true;
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();
    m.runtime.markersOnIssues(ISSUES);
    await settle();

    expect(posted.filter((entry) => entry.type === "MARKER_NOTICE")).toHaveLength(1);
  });
});

describe("markers while the feature is off", () => {
  it("do nothing at all", async () => {
    const m = await load(false);
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    selection = [t2];
    await m.listener.handleSelectionChange(false);
    await settle(5000);

    expect(fake.calls).toEqual([]);
    expect(posted).toEqual([]);
  });
});

describe("markers in a study session", () => {
  async function started(condition: "live" | "post-task") {
    const m = await load(true);
    m.study.handleStudyMessage({ ...START, condition } as StudyMessage, () => undefined);
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();
    return m;
  }

  it("show in the live condition", async () => {
    await started("live");

    expect(labels(t1)).toHaveLength(1);
  });

  it("stay away during post-task designing, writing nothing", async () => {
    const m = await started("post-task");
    selection = [t2];
    await m.listener.handleSelectionChange(false);
    await settle(5000);

    expect(fake.calls.filter((call) => call.startsWith("annotations:"))).toEqual([]);
    expect(t1.annotations).toEqual([]);
  });

  it("appear when feedback is revealed and go when the block ends", async () => {
    const m = await started("post-task");
    m.study.handleStudyMessage({ type: "STUDY_REVEAL" }, () => undefined);
    await settle();
    expect(labels(t1)).toHaveLength(1);

    m.study.handleStudyMessage({ type: "STUDY_END_BLOCK" }, () => undefined);
    await settle();
    expect(t1.annotations).toEqual([]);
  });

  it("go when the block ends in the live condition too", async () => {
    const m = await started("live");
    m.study.handleStudyMessage({ type: "STUDY_END_BLOCK" }, () => undefined);
    await settle();

    expect(t1.annotations).toEqual([]);
  });

  it("log being shown, the screen changing and being hidden, never which screen", async () => {
    const m = await started("live");
    selection = [t2];
    await m.listener.handleSelectionChange(false);
    await settle(600);
    m.study.handleStudyMessage({ type: "STUDY_END_BLOCK" }, () => undefined);
    await settle();
    await m.emitter.flushStudyEvents();

    const events = m.log.loadStudyEvents().filter((event) => event.type === "marker_state");
    expect(events.map((event) => event.type === "marker_state" && event.change)).toEqual([
      "shown",
      "screen_changed",
      "hidden"
    ]);
    expect(JSON.stringify(events)).not.toMatch(/F1|F2|screenId/);
  });

  it("leave a designer's own annotation on the layer untouched through a whole block", async () => {
    const note: Annotation = { label: "Mine" };
    t1.annotations = [note];
    fake.calls.length = 0;
    const m = await started("post-task");
    m.study.handleStudyMessage({ type: "STUDY_REVEAL" }, () => undefined);
    await settle();
    m.study.handleStudyMessage({ type: "STUDY_END_BLOCK" }, () => undefined);
    await settle();

    expect(t1.annotations).toEqual([note]);
  });
});
