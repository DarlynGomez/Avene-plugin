import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleRootMessage, isRootMessage } from "./rootActionsProtocol";

const SIGNATURE = "#9CB5B1|#FFFFFF|sage/muted|4.5";

const OPEN_A = {
  state: "open",
  severityAtLastDetection: "high",
  encounterCount: 0,
  lastDetectedAt: "2026-09-08T00:00:00.000Z"
};
const OPEN_B = { ...OPEN_A };
const IMPORTANT_C = { ...OPEN_A, state: "important" };

const PAGE = { type: "PAGE", backgrounds: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }] };
function textNode(id: string) {
  return {
    id,
    name: `Text ${id}`,
    type: "TEXT",
    fontSize: 16,
    fontName: { family: "Inter", style: "Regular" },
    fills: [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.95 } }],
    opacity: 1,
    blendMode: "NORMAL",
    visible: true,
    parent: PAGE
  };
}
const NODES: Record<string, ReturnType<typeof textNode>> = {
  "1:1": textNode("1:1"),
  "1:2": textNode("1:2"),
  "1:3": textNode("1:3")
};

describe("isRootMessage", () => {
  it.each(["ROOT_DEFER", "ROOT_MARK_IMPORTANT", "ROOT_UNMARK_IMPORTANT"])(
    "requires an array of string issueIds for %s",
    (type) => {
      expect(isRootMessage({ type, issueIds: ["a", "b"] })).toBe(true);
      expect(isRootMessage({ type, issueIds: [] })).toBe(true);
      expect(isRootMessage({ type })).toBe(false);
      expect(isRootMessage({ type, issueIds: [1, 2] })).toBe(false);
      expect(isRootMessage({ type, issueIds: "a" })).toBe(false);
    }
  );

  it("requires issueIds, a signature, and clearDecision for ROOT_REOPEN", () => {
    const base = {
      type: "ROOT_REOPEN",
      issueIds: ["a"],
      signature: SIGNATURE,
      clearDecision: true
    };
    expect(isRootMessage(base)).toBe(true);
    expect(isRootMessage({ ...base, signature: undefined })).toBe(false);
    expect(isRootMessage({ ...base, clearDecision: undefined })).toBe(false);
  });

  it("requires issueIds, a non-empty-typed reason field, signature, and fromDecisionOffer for ROOT_IGNORE", () => {
    const base = {
      type: "ROOT_IGNORE",
      issueIds: ["a"],
      reason: "x",
      signature: SIGNATURE,
      fromDecisionOffer: false
    };
    expect(isRootMessage(base)).toBe(true);
    expect(isRootMessage({ ...base, reason: undefined })).toBe(false);
    expect(isRootMessage({ ...base, signature: undefined })).toBe(false);
    expect(isRootMessage({ ...base, fromDecisionOffer: undefined })).toBe(false);
  });

  it("rejects an unrecognized type and non-objects", () => {
    expect(isRootMessage({ type: "ISSUE_DEFER", issueId: "a" })).toBe(false);
    expect(isRootMessage(null)).toBe(false);
    expect(isRootMessage("ROOT_DEFER")).toBe(false);
  });
});

describe("handleRootMessage", () => {
  const getPluginData = vi.fn();
  const setPluginData = vi.fn();
  const getNodeByIdAsync = vi.fn();

  beforeEach(() => {
    getPluginData.mockReset();
    setPluginData.mockReset();
    getNodeByIdAsync.mockReset();
    getNodeByIdAsync.mockImplementation(async (id: string) => NODES[id] ?? null);
    getPluginData.mockImplementation((key: string) =>
      key === "cadt.issues.v1"
        ? JSON.stringify({
            "contrast:1:1": OPEN_A,
            "contrast:1:2": OPEN_B,
            "contrast:1:3": IMPORTANT_C
          })
        : ""
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("figma", { root: { getPluginData, setPluginData }, getNodeByIdAsync });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("defers every open instance, persists the change, and replies with the full updated list", async () => {
    const reply = vi.fn();
    await handleRootMessage(
      { type: "ROOT_DEFER", issueIds: ["contrast:1:1", "contrast:1:2", "contrast:1:3"] },
      reply
    );

    const persisted = JSON.parse(setPluginData.mock.calls[0][1]);
    expect(persisted["contrast:1:1"].state).toBe("deferred");
    expect(persisted["contrast:1:2"].state).toBe("deferred");
    // Important is left alone by a root level defer
    expect(persisted["contrast:1:3"].state).toBe("important");

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ISSUES_UPDATED",
        issues: expect.arrayContaining([
          expect.objectContaining({ id: "contrast:1:1", state: "deferred" })
        ])
      })
    );
  });

  it("marks every eligible instance important", async () => {
    const reply = vi.fn();
    await handleRootMessage(
      { type: "ROOT_MARK_IMPORTANT", issueIds: ["contrast:1:1", "contrast:1:2"] },
      reply
    );

    const persisted = JSON.parse(setPluginData.mock.calls[0][1]);
    expect(persisted["contrast:1:1"].state).toBe("important");
    expect(persisted["contrast:1:2"].state).toBe("important");
  });

  it("unmarks only the currently important instance", async () => {
    const reply = vi.fn();
    await handleRootMessage(
      { type: "ROOT_UNMARK_IMPORTANT", issueIds: ["contrast:1:1", "contrast:1:3"] },
      reply
    );

    const persisted = JSON.parse(setPluginData.mock.calls[0][1]);
    expect(persisted["contrast:1:1"].state).toBe("open");
    expect(persisted["contrast:1:3"].state).toBe("open");
  });

  it("ignores every included instance with one reason and records a decision", async () => {
    const reply = vi.fn();
    await handleRootMessage(
      {
        type: "ROOT_IGNORE",
        issueIds: ["contrast:1:1", "contrast:1:2"],
        reason: "Brand color required by guidelines; tracked for the next brand review",
        signature: SIGNATURE,
        fromDecisionOffer: false
      },
      reply
    );

    const persistedIssues = JSON.parse(setPluginData.mock.calls[0][1]);
    expect(persistedIssues["contrast:1:1"].state).toBe("ignored");
    expect(persistedIssues["contrast:1:2"].state).toBe("ignored");

    const decisionCall = setPluginData.mock.calls.find((call) => call[0] === "cadt.decisions.v1");
    if (!decisionCall) {
      throw new Error("expected a write to cadt.decisions.v1");
    }
    const persistedDecisions = JSON.parse(decisionCall[1]);
    expect(persistedDecisions[SIGNATURE]).toMatchObject({
      reason: "Brand color required by guidelines; tracked for the next brand review",
      severityAtDecision: "high"
    });
  });

  it("rejects an empty reason for the whole action, enforced here and not only in the UI", async () => {
    const reply = vi.fn();
    await handleRootMessage(
      {
        type: "ROOT_IGNORE",
        issueIds: ["contrast:1:1"],
        reason: "   ",
        signature: SIGNATURE,
        fromDecisionOffer: false
      },
      reply
    );

    expect(setPluginData).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith({
      type: "ROOT_ACTION_FAILED",
      issueIds: ["contrast:1:1"],
      message: "A reason is required to ignore an issue"
    });
  });

  it("reopens only the ignored instances from the Decisions view", async () => {
    getPluginData.mockImplementation((key: string) =>
      key === "cadt.issues.v1"
        ? JSON.stringify({ "contrast:1:1": { ...OPEN_A, state: "ignored" } })
        : ""
    );
    const reply = vi.fn();
    await handleRootMessage(
      {
        type: "ROOT_REOPEN",
        issueIds: ["contrast:1:1"],
        signature: SIGNATURE,
        clearDecision: true
      },
      reply
    );

    const persisted = JSON.parse(setPluginData.mock.calls[0][1]);
    expect(persisted["contrast:1:1"].state).toBe("open");
  });

  function stubDecidedIssueAndDecision() {
    getPluginData.mockImplementation((key: string) => {
      if (key === "cadt.issues.v1") {
        return JSON.stringify({ "contrast:1:1": { ...OPEN_A, state: "ignored" } });
      }
      if (key === "cadt.decisions.v1") {
        return JSON.stringify({
          [SIGNATURE]: {
            reason: "Old reason",
            recordedAt: "2026-01-01",
            severityAtDecision: "high"
          }
        });
      }
      return "";
    });
  }

  it("clears the root's recorded decision on a full reopen, per ADR-032", async () => {
    stubDecidedIssueAndDecision();
    const reply = vi.fn();
    await handleRootMessage(
      {
        type: "ROOT_REOPEN",
        issueIds: ["contrast:1:1"],
        signature: SIGNATURE,
        clearDecision: true
      },
      reply
    );

    const decisionCall = setPluginData.mock.calls.find((call) => call[0] === "cadt.decisions.v1");
    if (!decisionCall) {
      throw new Error("expected a write to cadt.decisions.v1");
    }
    const persistedDecisions = JSON.parse(decisionCall[1]);
    expect(persistedDecisions[SIGNATURE]).toBeUndefined();
  });

  it("leaves the decision alone on a partial reopen, clearDecision false", async () => {
    stubDecidedIssueAndDecision();
    const reply = vi.fn();
    await handleRootMessage(
      {
        type: "ROOT_REOPEN",
        issueIds: ["contrast:1:1"],
        signature: SIGNATURE,
        clearDecision: false
      },
      reply
    );

    const decisionCall = setPluginData.mock.calls.find((call) => call[0] === "cadt.decisions.v1");
    expect(decisionCall).toBeUndefined();
  });

  it("fails without saving when every targeted issue no longer exists", async () => {
    const reply = vi.fn();
    await handleRootMessage({ type: "ROOT_MARK_IMPORTANT", issueIds: ["contrast:9:9"] }, reply);

    expect(setPluginData).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith({
      type: "ROOT_ACTION_FAILED",
      issueIds: ["contrast:9:9"],
      message: "That issue no longer exists."
    });
  });

  it("changes nothing, and still replies with success, when no instance is eligible", async () => {
    const reply = vi.fn();
    // Every instance is already open so there is nothing to unmark
    await handleRootMessage(
      { type: "ROOT_UNMARK_IMPORTANT", issueIds: ["contrast:1:1", "contrast:1:2"] },
      reply
    );

    const persisted = JSON.parse(setPluginData.mock.calls[0][1]);
    expect(persisted["contrast:1:1"].state).toBe("open");
    expect(persisted["contrast:1:2"].state).toBe("open");
    expect(reply).toHaveBeenCalledWith(expect.objectContaining({ type: "ISSUES_UPDATED" }));
  });

  it("reports the failure reason rather than throwing when the save itself fails", async () => {
    setPluginData.mockImplementation(() => {
      throw new Error("read-only document");
    });
    const reply = vi.fn();
    await handleRootMessage({ type: "ROOT_DEFER", issueIds: ["contrast:1:1"] }, reply);

    expect(reply).toHaveBeenCalledWith({
      type: "ROOT_ACTION_FAILED",
      issueIds: ["contrast:1:1"],
      message: "read-only document"
    });
  });
});
