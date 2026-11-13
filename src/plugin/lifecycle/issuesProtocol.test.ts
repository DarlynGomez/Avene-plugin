import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleIssueMessage, isIssueMessage } from "./issuesProtocol";

const ISSUE_ID = "contrast:1:1";
const PERSISTED_OPEN = {
  state: "open",
  severityAtLastDetection: "high",
  encounterCount: 0,
  lastDetectedAt: "2026-09-08T00:00:00.000Z"
};
const RESOLVED_OPEN_ISSUE = {
  id: ISSUE_ID,
  ruleId: "contrast",
  nodeId: "1:1",
  nodeName: "Body copy",
  // TEXT_NODE has no parent here so it is its own screen
  screenId: "1:1",
  screenName: "Body copy",
  ...PERSISTED_OPEN
};
const TEXT_NODE = {
  id: "1:1",
  name: "Body copy",
  type: "TEXT",
  fontSize: 16,
  fontName: { family: "Inter", style: "Regular" },
  fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }]
};

describe("isIssueMessage", () => {
  it("accepts ISSUES_SUBSCRIBE with no other fields", () => {
    expect(isIssueMessage({ type: "ISSUES_SUBSCRIBE" })).toBe(true);
  });

  it.each(["ISSUE_DEFER", "ISSUE_FLAG_IMPORTANT", "ISSUE_REOPEN", "ISSUE_FOCUS"])(
    "requires a string issueId for %s",
    (type) => {
      expect(isIssueMessage({ type, issueId: ISSUE_ID })).toBe(true);
      expect(isIssueMessage({ type })).toBe(false);
      expect(isIssueMessage({ type, issueId: 5 })).toBe(false);
    }
  );

  it("requires both issueId and reason for ISSUE_IGNORE", () => {
    expect(isIssueMessage({ type: "ISSUE_IGNORE", issueId: ISSUE_ID, reason: "x" })).toBe(true);
    expect(isIssueMessage({ type: "ISSUE_IGNORE", issueId: ISSUE_ID })).toBe(false);
  });

  it("rejects an unrecognized type and non-objects", () => {
    expect(isIssueMessage({ type: "CALIBRATION_LOAD" })).toBe(false);
    expect(isIssueMessage(null)).toBe(false);
    expect(isIssueMessage("ISSUES_SUBSCRIBE")).toBe(false);
  });
});

describe("handleIssueMessage", () => {
  const getPluginData = vi.fn();
  const setPluginData = vi.fn();
  const getNodeByIdAsync = vi.fn();
  let selection: unknown[] = [];
  const scrollAndZoomIntoView = vi.fn();
  const currentPage = {
    get selection() {
      return selection;
    },
    set selection(value: unknown[]) {
      selection = value;
    }
  };

  beforeEach(() => {
    selection = [];
    getPluginData.mockReset();
    setPluginData.mockReset();
    getNodeByIdAsync.mockReset();
    scrollAndZoomIntoView.mockReset();
    getPluginData.mockReturnValue(JSON.stringify({ [ISSUE_ID]: PERSISTED_OPEN }));
    getNodeByIdAsync.mockResolvedValue(TEXT_NODE);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("figma", {
      mixed: Symbol("figma.mixed"),
      root: { getPluginData, setPluginData },
      getNodeByIdAsync,
      currentPage,
      viewport: { scrollAndZoomIntoView }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("replies with the full list on subscribe", async () => {
    const reply = vi.fn();
    await handleIssueMessage({ type: "ISSUES_SUBSCRIBE" }, reply);

    expect(reply).toHaveBeenCalledWith({
      type: "ISSUES_UPDATED",
      issues: [RESOLVED_OPEN_ISSUE],
      decisions: {}
    });
  });

  it("defers an open issue and persists only section 5.5's fields, with the time it was put off", async () => {
    const reply = vi.fn();
    await handleIssueMessage({ type: "ISSUE_DEFER", issueId: ISSUE_ID }, reply);

    const written = JSON.parse(setPluginData.mock.calls[0][1] as string) as Record<
      string,
      Record<string, unknown>
    >;
    const { deferredAt, ...rest } = written[ISSUE_ID];
    expect(rest).toEqual({ ...PERSISTED_OPEN, state: "deferred" });
    expect(Number.isNaN(Date.parse(String(deferredAt)))).toBe(false);
    expect(reply).toHaveBeenCalledWith({
      type: "ISSUES_UPDATED",
      issues: [{ ...RESOLVED_OPEN_ISSUE, state: "deferred", deferredAt }],
      decisions: {}
    });
  });

  it("fails with a reason rather than throwing when the issue does not exist", async () => {
    const reply = vi.fn();
    await handleIssueMessage({ type: "ISSUE_DEFER", issueId: "contrast:9:9" }, reply);

    expect(reply).toHaveBeenCalledWith({
      type: "ISSUE_ACTION_FAILED",
      issueId: "contrast:9:9",
      message: "That issue no longer exists."
    });
    expect(setPluginData).not.toHaveBeenCalled();
  });

  it("surfaces a rejected transition from the state machine rather than saving anyway", async () => {
    getPluginData.mockReturnValue(
      JSON.stringify({ [ISSUE_ID]: { ...PERSISTED_OPEN, state: "resolved" } })
    );
    const reply = vi.fn();

    await handleIssueMessage({ type: "ISSUE_DEFER", issueId: ISSUE_ID }, reply);

    expect(reply).toHaveBeenCalledWith({
      type: "ISSUE_ACTION_FAILED",
      issueId: ISSUE_ID,
      message: "Cannot defer an issue in state 'resolved'"
    });
    expect(setPluginData).not.toHaveBeenCalled();
  });

  it("rejects an ignore action with an empty reason, enforced here too, not only in the UI", async () => {
    const reply = vi.fn();
    await handleIssueMessage({ type: "ISSUE_IGNORE", issueId: ISSUE_ID, reason: "  " }, reply);

    expect(reply).toHaveBeenCalledWith({
      type: "ISSUE_ACTION_FAILED",
      issueId: ISSUE_ID,
      message: "A reason is required to ignore an issue"
    });
    expect(setPluginData).not.toHaveBeenCalled();
  });

  it("does not report success when the save itself fails", async () => {
    setPluginData.mockImplementation(() => {
      throw new Error("read-only document");
    });
    const reply = vi.fn();

    await handleIssueMessage({ type: "ISSUE_DEFER", issueId: ISSUE_ID }, reply);

    expect(reply).toHaveBeenCalledWith({
      type: "ISSUE_ACTION_FAILED",
      issueId: ISSUE_ID,
      message: "read-only document"
    });
  });

  it("focuses a node by selecting it and scrolling it into view, writing nothing to the canvas", async () => {
    const reply = vi.fn();
    await handleIssueMessage({ type: "ISSUE_FOCUS", issueId: ISSUE_ID }, reply);

    expect(currentPage.selection).toEqual([TEXT_NODE]);
    expect(scrollAndZoomIntoView).toHaveBeenCalledWith([TEXT_NODE]);
    expect(reply).not.toHaveBeenCalled();
  });

  it("fails focus with a reason when the node no longer exists", async () => {
    getNodeByIdAsync.mockResolvedValue(null);
    const reply = vi.fn();

    await handleIssueMessage({ type: "ISSUE_FOCUS", issueId: ISSUE_ID }, reply);

    expect(reply).toHaveBeenCalledWith({
      type: "ISSUE_ACTION_FAILED",
      issueId: ISSUE_ID,
      message: "That node no longer exists in this file."
    });
    expect(scrollAndZoomIntoView).not.toHaveBeenCalled();
  });
});
