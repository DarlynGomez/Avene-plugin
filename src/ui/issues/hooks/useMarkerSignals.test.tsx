import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IssueSummary } from "../../../shared/issues/issueTypes";
import { IssuePanel } from "../IssuePanel";

function emit(message: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
  });
}

function issue(id: string, node: string, foreground: string): IssueSummary {
  return {
    id,
    ruleId: "contrast",
    nodeId: node,
    nodeName: `Layer ${node}`,
    screenId: "screen-1",
    screenName: "Home",
    state: "open",
    severityAtLastDetection: "high",
    encounterCount: 0,
    lastDetectedAt: "2026-10-12T00:00:00.000Z",
    evidence: {
      measuredRatio: 2.17,
      requiredRatio: 4.5,
      foregroundHex: foreground,
      backgroundHex: "#FFFFFF",
      foregroundBinding: null
    }
  };
}

const scrollIntoView = vi.fn();
let posted: string[];

beforeEach(() => {
  posted = [];
  Element.prototype.scrollIntoView = scrollIntoView;
  scrollIntoView.mockClear();
  vi.spyOn(window.parent, "postMessage").mockImplementation((data: unknown) => {
    const type = (data as { pluginMessage?: { type?: string } }).pluginMessage?.type;
    if (type) posted.push(type);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function cards() {
  return [...document.querySelectorAll("[data-root-signature]")] as HTMLElement[];
}

describe("a marked layer was selected", () => {
  function render2() {
    render(<IssuePanel aiAssistanceLevel={3} />);
    emit({
      type: "ISSUES_UPDATED",
      issues: [issue("contrast:1:1", "1:1", "#9CB5B1"), issue("contrast:2:2", "2:2", "#888888")],
      decisions: {}
    });
  }

  it("scrolls to the root's card and marks it", () => {
    render2();
    const [first, second] = cards();
    emit({ type: "MARKER_SELECTED", signature: second?.dataset.rootSignature });

    expect(second).toHaveAttribute("data-marked", "true");
    expect(first).not.toHaveAttribute("data-marked");
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("moves the mark when another marked layer is selected", () => {
    render2();
    const [first, second] = cards();
    emit({ type: "MARKER_SELECTED", signature: first?.dataset.rootSignature });
    emit({ type: "MARKER_SELECTED", signature: second?.dataset.rootSignature });

    expect(first).not.toHaveAttribute("data-marked");
    expect(second).toHaveAttribute("data-marked", "true");
  });

  it("does nothing for a root that is not in the list", () => {
    render2();
    emit({ type: "MARKER_SELECTED", signature: "not-a-root" });

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(document.querySelector('[data-marked="true"]')).toBeNull();
  });

  it("never asks the plugin to select or focus anything in response", () => {
    render2();
    emit({ type: "MARKER_SELECTED", signature: cards()[0]?.dataset.rootSignature });

    expect(posted).not.toContain("SHOW_ON_CANVAS");
    expect(posted).not.toContain("ISSUE_FOCUS");
    expect(posted).not.toContain("RESTORE_SELECTION");
  });
});

describe("a marker notice", () => {
  it("is shown in the panel in plain words", () => {
    render(<IssuePanel aiAssistanceLevel={3} />);
    emit({
      type: "ISSUES_UPDATED",
      issues: [issue("contrast:1:1", "1:1", "#9CB5B1")],
      decisions: {}
    });
    emit({
      type: "MARKER_NOTICE",
      message: "Markers are off because this file is view only for you."
    });

    expect(screen.getByRole("status")).toHaveTextContent("view only for you");
  });

  it("is not shown when there is none", () => {
    render(<IssuePanel aiAssistanceLevel={3} />);
    emit({
      type: "ISSUES_UPDATED",
      issues: [issue("contrast:1:1", "1:1", "#9CB5B1")],
      decisions: {}
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
