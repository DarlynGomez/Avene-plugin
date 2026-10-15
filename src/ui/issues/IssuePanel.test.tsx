import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IssueSummary } from "../../shared/issues/issueTypes";
import { IssuePanel } from "./IssuePanel";

function emit(message: unknown) {
  window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
}

function openIssue(overrides: Partial<IssueSummary> = {}): IssueSummary {
  return {
    id: "contrast:1:1",
    ruleId: "contrast",
    nodeId: "1:1",
    nodeName: "Body copy",
    screenId: "screen-1",
    screenName: "Product Detail Screen",
    state: "open",
    severityAtLastDetection: "high",
    encounterCount: 0,
    lastDetectedAt: "2026-09-08T00:00:00.000Z",
    evidence: {
      measuredRatio: 2.17,
      requiredRatio: 4.5,
      foregroundHex: "#9CB5B1",
      backgroundHex: "#FFFFFF",
      foregroundBinding: "sage/muted"
    },
    ...overrides
  };
}

function secondInstanceOfSameRoot(): IssueSummary {
  return openIssue({
    id: "contrast:1:2",
    nodeId: "1:2",
    nodeName: "Footer copy"
  });
}

function postedMessages(posted: unknown[]) {
  return posted.filter(
    (message): message is { type: string; [key: string]: unknown } =>
      typeof message === "object" && message !== null && "type" in message
  );
}

describe("IssuePanel", () => {
  let posted: unknown[] = [];

  beforeEach(() => {
    posted = [];
    vi.spyOn(window.parent, "postMessage").mockImplementation((message) => {
      posted.push((message as { pluginMessage: unknown }).pluginMessage);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("is a labelled landmark showing the computed headline and the View All count", async () => {
    render(<IssuePanel aiAssistanceLevel={1} />);
    await act(async () => {
      emit({ type: "ISSUES_UPDATED", issues: [openIssue()], decisions: {} });
    });

    expect(screen.getByRole("main", { name: "Accessibility issues" })).toBeInTheDocument();
    expect(screen.getByText("1 color causes 1 of 1 issues.")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "View All (1)" })).toBeInTheDocument();
    expect(screen.getByText("sage/muted on #FFFFFF")).toBeInTheDocument();
  });

  it("shows the Ignored filter count and its reason once a root is fully ignored", async () => {
    render(<IssuePanel aiAssistanceLevel={1} />);
    await act(async () => {
      emit({
        type: "ISSUES_UPDATED",
        issues: [openIssue({ state: "ignored", ignoredReason: "Brand color" })],
        decisions: {}
      });
    });

    expect(screen.getByRole("option", { name: "Ignored (1)" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Filter issues" }), {
      target: { value: "ignored" }
    });
    expect(screen.getByText(/Reason not recorded/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen" })).toBeInTheDocument();
  });

  it("shows the selection banner on Focus layers and restores on the Restore button", async () => {
    render(<IssuePanel aiAssistanceLevel={1} />);
    await act(async () => {
      emit({
        type: "ISSUES_UPDATED",
        issues: [openIssue(), secondInstanceOfSameRoot()],
        decisions: {}
      });
    });

    fireEvent.click(screen.getByText("Related grouped issues"));
    fireEvent.click(screen.getByRole("button", { name: "Focus 2 layers" }));
    expect(postedMessages(posted).some((m) => m.type === "SHOW_ON_CANVAS")).toBe(true);
    expect(screen.getByText("Showing 2 layers on canvas")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restore selection" }));
    expect(postedMessages(posted).some((m) => m.type === "RESTORE_SELECTION")).toBe(true);
    expect(screen.queryByText("Showing 2 layers on canvas")).not.toBeInTheDocument();
  });

  it("restores the selection on Escape when no sheet is open", async () => {
    render(<IssuePanel aiAssistanceLevel={1} />);
    await act(async () => {
      emit({
        type: "ISSUES_UPDATED",
        issues: [openIssue(), secondInstanceOfSameRoot()],
        decisions: {}
      });
    });

    fireEvent.click(screen.getByText("Related grouped issues"));
    fireEvent.click(screen.getByRole("button", { name: "Focus 2 layers" }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(postedMessages(posted).some((m) => m.type === "RESTORE_SELECTION")).toBe(true);
    expect(screen.queryByText("Showing 2 layers on canvas")).not.toBeInTheDocument();
  });

  it("disables Ignore issue until the reason field has text, then sends it with the ignore action", async () => {
    render(<IssuePanel aiAssistanceLevel={1} />);
    await act(async () => {
      emit({ type: "ISSUES_UPDATED", issues: [openIssue()], decisions: {} });
    });

    fireEvent.click(screen.getByRole("button", { name: "Ignore" }));
    const recordButton = screen.getByRole("button", { name: "Ignore issue" });
    expect(recordButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Type your reason"), {
      target: { value: "Brand color required by guidelines" }
    });
    expect(recordButton).toBeEnabled();

    fireEvent.click(recordButton);
    const ignore = postedMessages(posted).find((m) => m.type === "ROOT_IGNORE");
    expect(ignore?.reason).toBe("Brand color required by guidelines");
    expect(ignore?.fromDecisionOffer).toBe(false);
  });

  it("surfaces a root action failure as an alert without losing the current list", async () => {
    render(<IssuePanel aiAssistanceLevel={1} />);
    await act(async () => {
      emit({ type: "ISSUES_UPDATED", issues: [openIssue()], decisions: {} });
    });
    await act(async () => {
      emit({
        type: "ROOT_ACTION_FAILED",
        issueIds: ["contrast:1:1"],
        message: "That root is not eligible."
      });
    });

    expect(screen.getByRole("alert")).toHaveTextContent("That root is not eligible.");
    expect(screen.getByText("sage/muted on #FFFFFF")).toBeInTheDocument();
  });
});
