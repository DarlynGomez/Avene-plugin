import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudyEvent } from "../shared/study/studyEvents";
import type { StudyMessage } from "../shared/study/studyMessageTypes";
import type { PluginToUiMessage } from "../shared/messageTypes";

const PAGE = { type: "PAGE", backgrounds: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }] };
const SIGNATURE = "#F2F2F2|#FFFFFF|none|4.5";

function failingText(id: string) {
  return {
    id,
    name: `Copy ${id}`,
    type: "TEXT",
    fontSize: 16,
    fontName: { family: "Inter", style: "Regular" },
    fontWeight: 400,
    fills: [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.95 } }],
    opacity: 1,
    blendMode: "NORMAL",
    visible: true,
    parent: PAGE
  };
}

const START: StudyMessage = {
  type: "STUDY_START_BLOCK",
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  paperConsentSigned: true
};

let data: Map<string, string>;
let nodes: Map<string, ReturnType<typeof failingText>>;
let failWrites = false;

function stubFigma() {
  failWrites = false;
  data = new Map();
  nodes = new Map(["1:1", "1:2", "1:3"].map((id) => [id, failingText(id)]));
  vi.stubGlobal("figma", {
    mixed: Symbol("figma.mixed"),
    root: {
      getPluginData: (key: string) => data.get(key) ?? "",
      setPluginData: (key: string, value: string) => {
        if (failWrites) throw new Error("read only");
        data.set(key, value);
      }
    },
    clientStorage: { getAsync: async () => undefined },
    getNodeByIdAsync: async (id: string) => nodes.get(id) ?? null,
    commitUndo: vi.fn(),
    loadFontAsync: vi.fn().mockResolvedValue(undefined),
    variables: { getVariableByIdAsync: vi.fn() },
    getStyleByIdAsync: vi.fn(),
    currentPage: {
      findAll: (predicate: (candidate: unknown) => boolean) =>
        [...nodes.values()].filter(predicate),
      findAllWithCriteria: () => [...nodes.values()],
      selection: []
    },
    viewport: { scrollAndZoomIntoView: vi.fn() },
    ui: { postMessage: vi.fn() }
  });
}

/** Loads the real handlers fresh, so the emitter queue and first seen sets start empty */
async function modules(consent: boolean) {
  vi.resetModules();
  if (!consent) {
    vi.doMock("./storage/calibrationStore", async (importOriginal) => ({
      ...(await importOriginal<typeof import("./storage/calibrationStore")>()),
      resolveCalibration: async () => ({
        scope: "study" as const,
        profile: { schemaVersion: 1, completedAt: "t", loggingConsent: false, answers: {} }
      })
    }));
  }
  return {
    study: await import("./lifecycle/studyProtocol"),
    scan: await import("./lifecycle/scanAndSync"),
    issues: await import("./lifecycle/issuesProtocol"),
    roots: await import("./lifecycle/rootActionsProtocol"),
    selection: await import("./lifecycle/selectionProtocol"),
    adjust: await import("./lifecycle/adjustProtocol"),
    log: await import("./study/adapter/studyLogStore"),
    emitter: await import("./study/adapter/studyEmitter")
  };
}

/** One live block, every step through the real handler */
async function runBlock(m: Awaited<ReturnType<typeof modules>>) {
  const replies: PluginToUiMessage[] = [];
  const reply = (message: PluginToUiMessage) => replies.push(message);
  const noReply = () => undefined;

  m.study.handleStudyMessage(START, reply);
  await m.scan.scanAndSync(new Set(["1:1", "1:2", "1:3"]), "test");
  await m.issues.handleIssueMessage({ type: "ISSUE_DEFER", issueId: "contrast:1:1" }, noReply);
  await m.roots.handleRootMessage(
    {
      type: "ROOT_IGNORE",
      issueIds: ["contrast:1:2", "contrast:1:3"],
      reason: "Brand colour",
      signature: SIGNATURE,
      fromDecisionOffer: false
    },
    noReply
  );
  await m.adjust.handleAdjustMessage(
    {
      type: "ADJUST_APPLY",
      issueId: "contrast:1:1",
      issueIds: ["contrast:1:1"],
      color: { r: 0, g: 0, b: 0.2 },
      optionChosen: "a",
      wheelOpened: false,
      hexRejected: false
    },
    noReply
  );
  m.study.handleStudyMessage({ type: "STUDY_REVEAL" }, reply);
  m.study.handleStudyMessage({ type: "STUDY_END_BLOCK" }, reply);
  await m.emitter.flushStudyEvents();
  return replies;
}

beforeEach(() => {
  stubFigma();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.doUnmock("./storage/calibrationStore");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("a full mock block through the real handlers", () => {
  it("produces exactly the expected events, in order", async () => {
    const m = await modules(true);
    const replies = await runBlock(m);
    const events: StudyEvent[] = m.log.loadStudyEvents();

    expect(events.map((event) => event.type)).toEqual([
      "block_started",
      "issue_first_detected",
      "issue_first_detected",
      "issue_first_detected",
      "issue_first_response",
      "issue_action",
      "issue_first_response",
      "issue_first_response",
      "issue_action",
      "reason_written",
      "adjust_event",
      "block_ended"
    ]);
    expect(
      replies.some(
        (reply) => reply.type === "STUDY_STATE" && reply.refusal?.code === "not-post-task"
      )
    ).toBe(true);
    expect(events.some((event) => event.type === "feedback_revealed")).toBe(false);
  });

  it("records the right details on each event", async () => {
    const m = await modules(true);
    await runBlock(m);
    const events = m.log.loadStudyEvents();
    const byType = <T extends StudyEvent["type"]>(type: T) =>
      events.filter((event): event is Extract<StudyEvent, { type: T }> => event.type === type);

    expect(byType("block_started")[0]).toMatchObject({
      ctx: { participantId: "P01", block: 1, task: "A", condition: "live", phase: "designing" },
      studyProfileVersion: 1
    });
    expect(
      byType("issue_first_detected").map((event) => [event.issueId, event.startingIssue])
    ).toEqual([
      ["contrast:1:1", false],
      ["contrast:1:2", false],
      ["contrast:1:3", false]
    ]);
    expect(byType("issue_first_response").map((event) => [event.issueId, event.via])).toEqual([
      ["contrast:1:1", "defer"],
      ["contrast:1:2", "ignore"],
      ["contrast:1:3", "ignore"]
    ]);
    expect(
      byType("issue_action").map((event) => [
        event.action,
        event.instanceCount,
        event.resultingState
      ])
    ).toEqual([
      ["defer", 1, "deferred"],
      ["ignore", 2, "ignored"]
    ]);
    expect(byType("issue_action")[0]?.target).toEqual({ kind: "issue", issueId: "contrast:1:1" });
    expect(byType("issue_action")[1]?.target).toEqual({ kind: "root", signature: SIGNATURE });
    expect(byType("reason_written")[0]).toMatchObject({
      text: "Brand colour",
      truncated: false,
      source: "ignore_sheet",
      target: { kind: "root", signature: SIGNATURE }
    });
    expect(byType("adjust_event")[0]).toMatchObject({ adjustLogIndex: 0, issueId: "contrast:1:1" });
    const ended = byType("block_ended")[0];
    expect(ended?.ctx.phase).toBe("ended");
    expect(ended?.issues).toEqual([
      { id: "contrast:1:1", state: "resolved", severity: expect.any(String) },
      { id: "contrast:1:2", state: "ignored", severity: expect.any(String) },
      { id: "contrast:1:3", state: "ignored", severity: expect.any(String) }
    ]);
  });

  it("points the adjust event at the real Adjust log entry", async () => {
    const m = await modules(true);
    await runBlock(m);
    const log = JSON.parse(data.get("cadt.adjustLog.v1") ?? "[]");
    const reference = m.log.loadStudyEvents().find((event) => event.type === "adjust_event");

    expect(log).toHaveLength(1);
    expect(reference).toMatchObject({ adjustLogIndex: 0, loggedAt: log[0].loggedAt });
  });

  it("counts a second action on an issue as an action but not as a first response", async () => {
    const m = await modules(true);
    await runBlock(m);
    const responses = m.log
      .loadStudyEvents()
      .filter((event) => event.type === "issue_first_response");

    expect(responses.filter((event) => event.issueId === "contrast:1:1")).toHaveLength(1);
  });

  it("does not record a second first detection when a later scan sees the same issues", async () => {
    const m = await modules(true);
    await runBlock(m);
    await m.scan.scanAndSync(new Set(["1:1", "1:2", "1:3"]), "again");
    await m.emitter.flushStudyEvents();

    const detected = m.log
      .loadStudyEvents()
      .filter((event) => event.type === "issue_first_detected");
    expect(detected).toHaveLength(3);
  });
});

describe("the same block without consent", () => {
  it("produces no events and writes no chunk", async () => {
    const m = await modules(false);
    await runBlock(m);

    expect(m.log.loadStudyEvents()).toEqual([]);
    expect([...data.keys()].filter((key) => key.startsWith("cadt.study.log.v1.c"))).toEqual([]);
    expect(data.has("cadt.study.session.v1")).toBe(true);
    expect(m.log.loadPersistedDropCounts().noConsent).toBeGreaterThan(0);
  });

  it("still runs the block itself, only the log is silent", async () => {
    const m = await modules(false);
    await runBlock(m);

    expect(JSON.parse(data.get("cadt.study.session.v1") ?? "{}").phase).toBe("ended");
    expect(Object.keys(JSON.parse(data.get("cadt.issues.v1") ?? "{}"))).toHaveLength(3);
  });
});

describe("outside a study session", () => {
  it("records nothing and counts no drops", async () => {
    const m = await modules(true);
    await m.scan.scanAndSync(new Set(["1:1", "1:2"]), "test");
    await m.issues.handleIssueMessage(
      { type: "ISSUE_DEFER", issueId: "contrast:1:1" },
      () => undefined
    );
    await m.emitter.flushStudyEvents();

    expect(m.log.loadStudyEvents()).toEqual([]);
    expect(m.log.getDropCounts().noSession).toBe(0);
    expect([...data.keys()].some((key) => key.startsWith("cadt.study.log.v1"))).toBe(false);
  });
});

describe("showing a root on the canvas", () => {
  it("is an action and a first response, and the plugin's own selection adds nothing", async () => {
    const m = await modules(true);
    m.study.handleStudyMessage(START, () => undefined);
    await m.scan.scanAndSync(new Set(["1:1", "1:2"]), "test");
    await m.selection.handleSelectionMessage({
      type: "SHOW_ON_CANVAS",
      nodeIds: ["1:1", "1:2"],
      signature: SIGNATURE
    });
    await m.emitter.flushStudyEvents();

    const events = m.log.loadStudyEvents();
    expect(events.map((event) => event.type).slice(-4)).toEqual([
      "issue_first_detected",
      "issue_first_response",
      "issue_first_response",
      "issue_action"
    ]);
    expect(events.at(-1)).toMatchObject({
      action: "show_on_canvas",
      target: { kind: "root", signature: SIGNATURE },
      instanceCount: 2
    });
    expect(events.filter((event) => event.type === "issue_first_response")).toHaveLength(2);
  });
});

describe("post-task designing", () => {
  it("records first detection exactly as live, and no response while feedback is withheld", async () => {
    const m = await modules(true);
    m.study.handleStudyMessage({ ...START, condition: "post-task" }, () => undefined);
    await m.scan.scanAndSync(new Set(["1:1", "1:2"]), "test");
    await m.selection.handleSelectionMessage({
      type: "SHOW_ON_CANVAS",
      nodeIds: ["1:1"],
      signature: SIGNATURE
    });
    await m.emitter.flushStudyEvents();

    const types = m.log.loadStudyEvents().map((event) => event.type);
    expect(types.filter((type) => type === "issue_first_detected")).toHaveLength(2);
    expect(types).not.toContain("issue_first_response");
  });

  it("records the reveal once, with the reviewing phase in its context", async () => {
    const m = await modules(true);
    m.study.handleStudyMessage({ ...START, condition: "post-task" }, () => undefined);
    m.study.handleStudyMessage({ type: "STUDY_REVEAL" }, () => undefined);
    await m.emitter.flushStudyEvents();

    const revealed = m.log.loadStudyEvents().filter((event) => event.type === "feedback_revealed");
    expect(revealed).toHaveLength(1);
    expect(revealed[0]?.ctx.phase).toBe("reviewing");
  });
});

describe("starting issues", () => {
  it("records issues already in the file as first detected at the start time, flagged", async () => {
    const m = await modules(true);
    await m.scan.scanAndSync(new Set(["1:1", "1:2"]), "before the block");
    m.study.handleStudyMessage(START, () => undefined);
    await m.scan.scanAndSync(new Set(["1:1", "1:2", "1:3"]), "during the block");
    await m.emitter.flushStudyEvents();

    const detected = m.log
      .loadStudyEvents()
      .filter((event) => event.type === "issue_first_detected");
    expect(detected.map((event) => [event.issueId, event.startingIssue])).toEqual([
      ["contrast:1:1", true],
      ["contrast:1:2", true],
      ["contrast:1:3", false]
    ]);
    const started = m.log.loadStudyEvents().find((event) => event.type === "block_started");
    expect(detected[0]?.at).toBe(started?.at);
  });
});

describe("exporting a block through the real handlers", () => {
  function exportReply(replies: PluginToUiMessage[]) {
    return replies.find((reply) => reply.type === "STUDY_EXPORT_READY");
  }

  it("sends one file with the schema version, session, events, adjust log and final snapshot", async () => {
    const m = await modules(true);
    await runBlock(m);
    const replies: PluginToUiMessage[] = [];
    m.study.handleStudyMessage({ type: "STUDY_EXPORT" }, (reply) => replies.push(reply));

    const ready = exportReply(replies);
    expect(ready).toMatchObject({
      type: "STUDY_EXPORT_READY",
      fileName: "cadt-study-P01-block1-taskA.json"
    });
    const file = JSON.parse(ready && "text" in ready ? ready.text : "{}");
    expect(file.schemaVersion).toBe(1);
    expect(file.session).toMatchObject({ participantId: "P01", phase: "ended" });
    expect(file.events).toEqual(m.log.loadStudyEvents());
    expect(file.events.length).toBe(ready && "eventCount" in ready ? ready.eventCount : -1);
    expect(file.adjustLog).toHaveLength(1);
    expect(file.finalSnapshot.map((row: { id: string }) => row.id)).toEqual([
      "contrast:1:1",
      "contrast:1:2",
      "contrast:1:3"
    ]);
    expect(file.droppedWrites).toBeDefined();
  });

  it("notes the export on the session and lists that time in the file itself", async () => {
    const m = await modules(true);
    await runBlock(m);
    const replies: PluginToUiMessage[] = [];
    m.study.handleStudyMessage({ type: "STUDY_EXPORT" }, (reply) => replies.push(reply));

    const stored = JSON.parse(data.get("cadt.study.session.v1") ?? "{}");
    const ready = exportReply(replies);
    const file = JSON.parse(ready && "text" in ready ? ready.text : "{}");
    expect(stored.exports).toHaveLength(1);
    expect(file.session.exports).toEqual(stored.exports);
    expect(file.exportedAt).toBe(stored.exports[0]);
    expect(replies.at(-1)).toMatchObject({
      type: "STUDY_STATE",
      session: { exports: stored.exports }
    });
  });

  it("can be taken mid block and has no final snapshot yet", async () => {
    const m = await modules(true);
    m.study.handleStudyMessage(START, () => undefined);
    await m.scan.scanAndSync(new Set(["1:1"]), "test");
    await m.emitter.flushStudyEvents();
    const replies: PluginToUiMessage[] = [];
    m.study.handleStudyMessage({ type: "STUDY_EXPORT" }, (reply) => replies.push(reply));

    const ready = exportReply(replies);
    const file = JSON.parse(ready && "text" in ready ? ready.text : "{}");
    expect(file.finalSnapshot).toBeNull();
    expect(file.session.phase).toBe("designing");
  });

  it("can be taken again, each one noted", async () => {
    const m = await modules(true);
    await runBlock(m);
    m.study.handleStudyMessage({ type: "STUDY_EXPORT" }, () => undefined);
    m.study.handleStudyMessage({ type: "STUDY_EXPORT" }, () => undefined);

    expect(JSON.parse(data.get("cadt.study.session.v1") ?? "{}").exports).toHaveLength(2);
  });

  it("is refused with no session, and sends no file", async () => {
    const m = await modules(true);
    const replies: PluginToUiMessage[] = [];
    m.study.handleStudyMessage({ type: "STUDY_EXPORT" }, (reply) => replies.push(reply));

    expect(exportReply(replies)).toBeUndefined();
    expect(replies[0]).toMatchObject({ type: "STUDY_STATE", refusal: { code: "no-session" } });
  });

  it("is refused after exit, and changes nothing", async () => {
    const m = await modules(true);
    await runBlock(m);
    m.study.handleStudyMessage({ type: "STUDY_EXIT" }, () => undefined);
    const before = data.get("cadt.study.session.v1");
    const replies: PluginToUiMessage[] = [];
    m.study.handleStudyMessage({ type: "STUDY_EXPORT" }, (reply) => replies.push(reply));

    expect(exportReply(replies)).toBeUndefined();
    expect(data.get("cadt.study.session.v1")).toBe(before);
  });

  it("sends no file when the export cannot be noted on the session", async () => {
    const m = await modules(true);
    await runBlock(m);
    failWrites = true;
    const replies: PluginToUiMessage[] = [];
    m.study.handleStudyMessage({ type: "STUDY_EXPORT" }, (reply) => replies.push(reply));
    failWrites = false;

    expect(exportReply(replies)).toBeUndefined();
    expect(replies[0]).toMatchObject({ refusal: { code: "save-failed" } });
  });

  it("exits cleanly after an export, keeping every record", async () => {
    const m = await modules(true);
    await runBlock(m);
    m.study.handleStudyMessage({ type: "STUDY_EXPORT" }, () => undefined);
    m.study.handleStudyMessage({ type: "STUDY_EXIT" }, () => undefined);

    const stored = JSON.parse(data.get("cadt.study.session.v1") ?? "{}");
    expect(stored.exitedAt).not.toBeNull();
    expect(stored.exports).toHaveLength(1);
    expect(m.log.loadStudyEvents().length).toBeGreaterThan(0);
  });
});
