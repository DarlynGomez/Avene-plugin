import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { IssueSummary } from "../../../shared/issues/issueTypes";
import { useIssues } from "./useIssues";

const ISSUE: IssueSummary = {
  id: "contrast:1:1",
  ruleId: "contrast",
  nodeId: "1:1",
  nodeName: "Body copy",
  state: "open",
  severityAtLastDetection: "high",
  encounterCount: 0,
  lastDetectedAt: "2026-09-08T00:00:00.000Z"
};

function emit(message: unknown) {
  window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
}

describe("useIssues", () => {
  it("subscribes on mount and stores the issues and decisions it receives", async () => {
    const postMessage = vi.spyOn(window.parent, "postMessage");
    const { result } = renderHook(() => useIssues());

    expect(postMessage).toHaveBeenCalledWith({ pluginMessage: { type: "ISSUES_SUBSCRIBE" } }, "*");
    expect(result.current.loading).toBe(true);

    const decision = {
      signature: "sig-1",
      reason: "Brand color",
      recordedAt: "2026-09-08T00:00:00.000Z",
      severityAtDecision: "high" as const
    };
    await act(async () => {
      emit({ type: "ISSUES_UPDATED", issues: [ISSUE], decisions: { "sig-1": decision } });
    });

    expect(result.current.issues).toEqual([ISSUE]);
    expect(result.current.decisions).toEqual({ "sig-1": decision });
    expect(result.current.loading).toBe(false);
    postMessage.mockRestore();
  });

  it("ignores a message with an invalid issue in the list", async () => {
    const { result } = renderHook(() => useIssues());

    await act(async () => {
      emit({ type: "ISSUES_UPDATED", issues: [{ nodeId: "1:1" }], decisions: {} });
    });

    expect(result.current.issues).toEqual([]);
  });

  it("focusIssue sends a bare ISSUE_FOCUS message with the issue id", () => {
    const postMessage = vi.spyOn(window.parent, "postMessage");
    const { result } = renderHook(() => useIssues());

    act(() => {
      result.current.focusIssue(ISSUE.id);
    });

    expect(postMessage).toHaveBeenCalledWith(
      { pluginMessage: { type: "ISSUE_FOCUS", issueId: ISSUE.id } },
      "*"
    );
    postMessage.mockRestore();
  });

  it.each([
    ["deferRoot", "ROOT_DEFER"],
    ["markRootImportant", "ROOT_MARK_IMPORTANT"],
    ["unmarkRootImportant", "ROOT_UNMARK_IMPORTANT"]
  ] as const)("%s sends a %s message with the issue ids", (action, type) => {
    const postMessage = vi.spyOn(window.parent, "postMessage");
    const { result } = renderHook(() => useIssues());

    act(() => {
      result.current[action]([ISSUE.id]);
    });

    expect(postMessage).toHaveBeenCalledWith(
      { pluginMessage: { type, issueIds: [ISSUE.id] } },
      "*"
    );
    postMessage.mockRestore();
  });

  it("sends the signature and clearDecision with a root reopen action, per ADR-032", () => {
    const postMessage = vi.spyOn(window.parent, "postMessage");
    const { result } = renderHook(() => useIssues());

    act(() => {
      result.current.reopenRoot([ISSUE.id], "sig-1", true);
    });

    expect(postMessage).toHaveBeenCalledWith(
      {
        pluginMessage: {
          type: "ROOT_REOPEN",
          issueIds: [ISSUE.id],
          signature: "sig-1",
          clearDecision: true
        }
      },
      "*"
    );
    postMessage.mockRestore();
  });

  it("sends the reason, signature, and offer flag with a root ignore action", () => {
    const postMessage = vi.spyOn(window.parent, "postMessage");
    const { result } = renderHook(() => useIssues());

    act(() => {
      result.current.ignoreRoot([ISSUE.id], "Client insisted on the brand color", "sig-1", true);
    });

    expect(postMessage).toHaveBeenCalledWith(
      {
        pluginMessage: {
          type: "ROOT_IGNORE",
          issueIds: [ISSUE.id],
          reason: "Client insisted on the brand color",
          signature: "sig-1",
          fromDecisionOffer: true
        }
      },
      "*"
    );
    postMessage.mockRestore();
  });

  it("showOnCanvas sends a SHOW_ON_CANVAS message with the node ids", () => {
    const postMessage = vi.spyOn(window.parent, "postMessage");
    const { result } = renderHook(() => useIssues());

    act(() => {
      result.current.showOnCanvas(["1:1"]);
    });

    expect(postMessage).toHaveBeenCalledWith(
      { pluginMessage: { type: "SHOW_ON_CANVAS", nodeIds: ["1:1"] } },
      "*"
    );
    postMessage.mockRestore();
  });

  it("restoreSelection sends a bare RESTORE_SELECTION message", () => {
    const postMessage = vi.spyOn(window.parent, "postMessage");
    const { result } = renderHook(() => useIssues());

    act(() => {
      result.current.restoreSelection();
    });

    expect(postMessage).toHaveBeenCalledWith({ pluginMessage: { type: "RESTORE_SELECTION" } }, "*");
    postMessage.mockRestore();
  });

  it("surfaces a rejected single-issue action without discarding the current list", async () => {
    const { result } = renderHook(() => useIssues());

    await act(async () => {
      emit({ type: "ISSUES_UPDATED", issues: [ISSUE], decisions: {} });
    });
    await act(async () => {
      emit({
        type: "ISSUE_ACTION_FAILED",
        issueId: ISSUE.id,
        message: "Cannot defer an issue in state 'resolved'"
      });
    });

    expect(result.current.actionError).toEqual({
      issueIds: [ISSUE.id],
      message: "Cannot defer an issue in state 'resolved'"
    });
    expect(result.current.issues).toEqual([ISSUE]);
  });

  it("surfaces a rejected root action with every affected issue id", async () => {
    const { result } = renderHook(() => useIssues());

    await act(async () => {
      emit({
        type: "ROOT_ACTION_FAILED",
        issueIds: [ISSUE.id, "contrast:1:2"],
        message: "Not eligible"
      });
    });

    expect(result.current.actionError).toEqual({
      issueIds: [ISSUE.id, "contrast:1:2"],
      message: "Not eligible"
    });
  });

  it("clears a prior action error once a fresh list arrives", async () => {
    const { result } = renderHook(() => useIssues());

    await act(async () => {
      emit({ type: "ISSUE_ACTION_FAILED", issueId: ISSUE.id, message: "failed" });
    });
    expect(result.current.actionError).not.toBeNull();

    await act(async () => {
      emit({ type: "ISSUES_UPDATED", issues: [], decisions: {} });
    });
    expect(result.current.actionError).toBeNull();
  });
});
