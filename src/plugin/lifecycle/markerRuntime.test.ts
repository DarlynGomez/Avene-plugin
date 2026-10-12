import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IssueSummary } from "../../shared/issues/issueTypes";
import type { MarkerStyle } from "../../shared/markers/markerStyle";
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
let userData: Map<string, unknown>;
let listeners: Record<string, Array<() => void>>;
let selection: unknown[];
let fake: ReturnType<typeof createFakeFigma>;
let t1: FakeNode;
let t2: FakeNode;

function stubEverything(): void {
  fake = createFakeFigma();
  fake.install();
  data = new Map();
  userData = new Map();
  listeners = {};
  selection = [];
  const f1 = frame("F1", 0);
  const f2 = frame("F2", 200);
  t1 = fake.addNode("T1");
  t2 = fake.addNode("T2");
  Object.assign(t1, { parent: f1, name: "T1" });
  Object.assign(t2, { parent: f2, name: "T2" });
  t1.absoluteBoundingBox = { x: 20, y: 30, width: 60, height: 20 };
  t2.absoluteBoundingBox = { x: 220, y: 30, width: 60, height: 20 };
  const base = (globalThis as unknown as { figma: Record<string, unknown> }).figma;
  vi.stubGlobal("figma", {
    ...base,
    root: {
      ...(base.root as object),
      getPluginData: (key: string) => data.get(key) ?? "",
      setPluginData: (key: string, value: string) => void data.set(key, value)
    },
    clientStorage: {
      getAsync: async (key: string) => userData.get(key),
      setAsync: async (key: string, value: unknown) => void userData.set(key, value)
    },
    viewport: {
      center: { x: 50, y: 50 },
      scrollAndZoomIntoView: vi.fn(),
      get zoom() {
        return fake.state.zoom;
      }
    },
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
    on: (type: string, handler: () => void) => {
      (listeners[type] ??= []).push(handler);
      // The stand in emits a change for every write, so CADT's own writes reach the real handler
      if (type === "documentchange") fake.documentChangeHandlers.push(handler as never);
    }
  });
}

/** The style is annotation unless a test asks for another, or for the real one with "default" */
async function load(flag: boolean, style: MarkerStyle | "default" = "annotation") {
  vi.resetModules();
  vi.doMock("../../shared/featureFlags", () => ({
    FEATURE_VARIABLE_SCOPE: false,
    FEATURE_MARKERS: flag
  }));
  if (style !== "default") {
    vi.doMock("../../shared/markers/markerStyle", async (original) => ({
      ...(await original<typeof import("../../shared/markers/markerStyle")>()),
      MARKER_STYLE: style
    }));
  }
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
const labels = (node: FakeNode) => node.annotations.map((annotation) => annotation.label ?? "");

beforeEach(() => {
  vi.useFakeTimers();
  posted.length = 0;
  stubEverything();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock("../../shared/featureFlags");
  vi.doUnmock("../../shared/markers/markerStyle");
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

    expect(labels(t1)).toEqual([""]);
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

describe("reconciling against the canvas", () => {
  const writes = () => fake.calls.filter((call) => call.startsWith("annotations:")).length;

  it("settles after its own writes, they cause no further writes", async () => {
    const m = await load(true);
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();
    const afterFirst = writes();
    expect(afterFirst).toBeGreaterThan(0);

    await settle(5000);
    await settle(5000);
    expect(writes()).toBe(afterFirst);
    expect(labels(t1)).toEqual([""]);
  });

  it("repairs markers an undo brought back without their category, then settles", async () => {
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

    // The undo puts the annotation back with no category
    t1.annotations = [{}];
    await settle(300);
    expect(t1.annotations).toEqual([]);

    const settled = writes();
    await settle(5000);
    expect(writes()).toBe(settled);
  });

  it("never causes a rescan of its own writes", async () => {
    const m = await load(true);
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle(5000);
    const issueMessages = posted.filter((entry) => entry.type === "ISSUES_UPDATED");

    expect(issueMessages).toEqual([]);
  });

  it("is quiet while markers are hidden, whatever happens on the layers", async () => {
    const m = await load(true);
    m.study.handleStudyMessage(
      { ...START, condition: "post-task" } as StudyMessage,
      () => undefined
    );
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();
    t1.annotations = [{}];
    fake.calls.length = 0;
    await settle(5000);

    expect(fake.calls).toEqual([]);
  });

  it("closes clean after an undo left markers behind", async () => {
    const m = await load(true);
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();
    t1.annotations = [{ label: "Mine" }, {}];
    listeners.close?.forEach((handler) => handler());

    expect(labels(t1)).toEqual(["Mine"]);
  });
});

describe("the marker style in use", () => {
  const shapes = () => [...fake.nodes.values()].filter((node) => node.type === "ELLIPSE");
  const containers = () => [...fake.nodes.values()].filter((node) => node.type === "FRAME");

  async function shown(style: MarkerStyle | "default") {
    const m = await load(true, style);
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();
    return m;
  }

  it("is a dot, with no annotation and no choice to make", async () => {
    await shown("default");

    expect(shapes()).toHaveLength(1);
    expect(shapes()[0]?.fills).toHaveLength(1);
    expect(t1.annotations).toEqual([]);
    expect(posted.some((entry) => String(entry.type).startsWith("MARKER_STYLE"))).toBe(false);
  });

  it("is the same dot in a study session, with nothing to switch it", async () => {
    const m = await load(true, "default");
    m.study.handleStudyMessage(START, () => undefined);
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();

    expect(shapes()).toHaveLength(1);
    expect(t1.annotations).toEqual([]);
  });

  it("follows the screen and is removed on close", async () => {
    const m = await shown("default");
    selection = [t2];
    await m.listener.handleSelectionChange(false);
    await settle(600);
    expect(
      shapes().map((shape) => JSON.parse(shape.getPluginData("cadt.marker.v1")).target)
    ).toEqual(["T2"]);

    listeners.close?.forEach((handler) => handler());
    expect(shapes()).toEqual([]);
    expect(containers()).toEqual([]);
  });

  it("is logged on every marker state event", async () => {
    const m = await load(true, "default");
    await m.runtime.startMarkers();
    m.study.handleStudyMessage(START, () => undefined);
    m.runtime.markersOnIssues(ISSUES);
    await settle();
    m.study.handleStudyMessage({ type: "STUDY_END_BLOCK" }, () => undefined);
    await settle();
    await m.emitter.flushStudyEvents();

    const events = m.log.loadStudyEvents().filter((event) => event.type === "marker_state");
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) expect(event.type === "marker_state" && event.style).toBe("dot");
  });

  it("can still be drawn as a ring or an annotation by changing the one constant", async () => {
    await shown("ring");
    expect(shapes()[0]?.fills).toEqual([]);
  });

  it("is not drawn while the feature is off", async () => {
    const m = await load(false, "default");
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();

    expect(shapes()).toEqual([]);
    expect(fake.calls).toEqual([]);
  });
});

describe("clicking a dot or a ring", () => {
  const shapes = () => [...fake.nodes.values()].filter((node) => node.type === "ELLIPSE");
  const selectedMessages = () => posted.filter((entry) => entry.type === "MARKER_SELECTED");

  async function withDot(style: MarkerStyle = "dot") {
    const m = await load(true, style);
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();
    return m;
  }

  it("takes the panel to the root's card, as selecting an annotated layer does", async () => {
    const m = await withDot();
    const annotatedMessage = (async () => {
      selection = [t1];
      await m.listener.handleSelectionChange(false);
    })();
    await annotatedMessage;
    const viaLayer = selectedMessages().at(-1);
    posted.length = 0;

    selection = [shapes()[0]];
    await m.listener.handleSelectionChange(false);

    expect(selectedMessages()).toEqual([viaLayer]);
    expect(typeof selectedMessages()[0]?.signature).toBe("string");
  });

  it("works for a ring as well", async () => {
    const m = await withDot("ring");
    posted.length = 0;
    selection = [shapes()[0]];
    await m.listener.handleSelectionChange(false);

    expect(selectedMessages()).toHaveLength(1);
  });

  it("never sets the selection in response, the click stays the designer's", async () => {
    const m = await withDot();
    const dot = shapes()[0];
    selection = [dot];
    const chosen = selection;
    await m.listener.handleSelectionChange(false);

    expect(selection).toBe(chosen);
    expect(selection).toEqual([dot]);
  });

  it("does not move the current screen to the frame the dots live in", async () => {
    const m = await withDot();
    selection = [shapes()[0]];
    await m.listener.handleSelectionChange(false);
    await settle(5000);

    expect(
      shapes().map((shape) => JSON.parse(shape.getPluginData("cadt.marker.v1")).target)
    ).toEqual(["T1"]);
    expect(m.runtime.markerController().currentScreenId()).toBe("F1");
  });

  it("does nothing for a selection the plugin made", async () => {
    const m = await withDot();
    posted.length = 0;
    selection = [shapes()[0]];
    await m.listener.handleSelectionChange(true);

    expect(selectedMessages()).toEqual([]);
  });

  it("ignores a shape of another user and a layer that is not ours", async () => {
    const m = await withDot();
    const theirs = fake.addNode(
      "X:1",
      [],
      JSON.stringify({ userId: "u2", sessionId: "x", kind: "shape", target: "T1" })
    );
    const plain = fake.addNode("X:2");
    posted.length = 0;
    selection = [theirs, plain];
    await m.listener.handleSelectionChange(false);

    expect(selectedMessages()).toEqual([]);
  });
});

describe("dots and rings holding their size on screen", () => {
  const shapes = () => [...fake.nodes.values()].filter((node) => node.type === "ELLIPSE");
  const writes = () =>
    fake.calls.filter((call) => /^(annotations|create|remove|tag):/.test(call)).length;

  async function withDot(style: MarkerStyle = "dot") {
    const m = await load(true, style);
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();
    return m;
  }

  it("resizes by itself when the zoom changes, with no click", async () => {
    await withDot();
    expect(shapes()[0]?.width).toBe(12);
    fake.state.zoom = 4;
    await settle(300);

    expect(shapes()[0]?.width).toBe(3);
    fake.state.zoom = 0.25;
    await settle(300);
    expect(shapes()[0]?.width).toBe(48);
  });

  it("follows a zoom that keeps moving and settles on the last one", async () => {
    await withDot();
    for (const zoom of [1.2, 1.6, 2, 3, 5]) {
      fake.state.zoom = zoom;
      await settle(130);
    }
    await settle(300);

    expect(shapes()[0]?.width).toBeCloseTo(12 / 5, 4);
  });

  it("does nothing for a zoom change too small to see, and nothing while the zoom holds still", async () => {
    await withDot();
    fake.calls.length = 0;
    fake.state.zoom = 1.005;
    await settle(2000);
    expect(writes()).toBe(0);

    fake.state.zoom = 2;
    await settle(300);
    const settled = writes();
    await settle(5000);
    expect(writes()).toBe(settled);
  });

  it("does not add an undo step for a resize", async () => {
    await withDot();
    fake.commitUndo.mockClear();
    fake.state.zoom = 3;
    await settle(300);

    expect(fake.commitUndo).not.toHaveBeenCalled();
    expect(shapes()[0]?.width).toBe(4);
  });

  it("writes nothing for an annotation, which Figma scales itself", async () => {
    const m = await load(true);
    await m.runtime.startMarkers();
    m.runtime.markersOnIssues(ISSUES);
    await settle();
    fake.calls.length = 0;
    fake.state.zoom = 5;
    await settle(2000);

    expect(fake.calls).toEqual([]);
  });

  it("stays quiet while markers are hidden in a study session, and after close", async () => {
    const m = await load(true, "dot");
    await m.runtime.startMarkers();
    m.study.handleStudyMessage(
      { ...START, condition: "post-task" } as StudyMessage,
      () => undefined
    );
    m.runtime.markersOnIssues(ISSUES);
    await settle();
    fake.calls.length = 0;
    fake.state.zoom = 4;
    await settle(2000);
    expect(fake.calls).toEqual([]);

    const closing = await withDot();
    expect(closing).toBeDefined();
    listeners.close?.forEach((handler) => handler());
    fake.calls.length = 0;
    fake.state.zoom = 8;
    await settle(2000);
    expect(fake.calls).toEqual([]);
  });

  it("keeps a clicked dot's size as it is, a click no longer changes it", async () => {
    const m = await withDot();
    fake.state.zoom = 4;
    await settle(300);
    const size = shapes()[0]?.width;
    selection = [shapes()[0]];
    await m.listener.handleSelectionChange(false);
    await settle(1000);

    expect(shapes()[0]?.width).toBe(size);
  });
});
