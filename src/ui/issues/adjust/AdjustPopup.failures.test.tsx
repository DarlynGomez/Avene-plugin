import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Root } from "../../../shared/grouping/groupingTypes";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
import { AdjustPopup } from "./AdjustPopup";

function issue(requiredRatio: number): IssueSummary {
  return {
    id: "contrast:1:1",
    ruleId: "contrast",
    nodeId: "1:1",
    nodeName: "Button label",
    state: "open",
    severityAtLastDetection: "medium",
    encounterCount: 0,
    lastDetectedAt: "2026-10-12T00:00:00.000Z",
    evidence: {
      measuredRatio: 3.29,
      requiredRatio,
      foregroundHex: "#FFFFFF",
      backgroundHex: "#CD7930"
    }
  };
}

const ROOT = (representativeIssueId: string): Root => ({
  signature: "sig",
  foregroundHex: "#FFFFFF",
  backgroundHex: "#CD7930",
  foregroundBinding: null,
  requiredRatio: 4.5,
  instances: [],
  representativeIssueId,
  backgroundBindings: [],
  displayState: "open",
  stateBreakdown: { open: 1 }
});

let posted: { type?: string; [key: string]: unknown }[];

function reply(message: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
  });
}

function show(requiredRatio: number) {
  render(
    <AdjustPopup
      root={ROOT("contrast:1:1")}
      representativeIssue={issue(requiredRatio)}
      selectedInstanceIds={new Set()}
      aiAssistanceLevel={3}
      onClose={vi.fn()}
    />
  );
  reply({
    type: "ADJUST_OPTIONS_READY",
    issueId: "contrast:1:1",
    palette: [],
    binding: null,
    variableScope: null
  });
}

beforeEach(() => {
  posted = [];
  vi.spyOn(window.parent, "postMessage").mockImplementation((data: unknown) => {
    const message = (data as { pluginMessage?: { type?: string } }).pluginMessage;
    if (message) posted.push(message);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("white text on a mid orange, the case that did nothing", () => {
  it("offers a first option that really passes, and Apply sends it", () => {
    show(4.5);
    fireEvent.click(screen.getByRole("button", { name: /Keep your colour/ }));

    expect(screen.queryByText(/below 4\.5/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(posted.some((message) => message.type === "ADJUST_APPLY")).toBe(true);
  });
});

describe("an option that cannot pass", () => {
  it("is labelled as below what is needed, and Apply stays disabled", () => {
    show(22);
    fireEvent.click(screen.getByRole("button", { name: /Keep your colour/ }));

    expect(screen.getByText(/below 22/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });
});

describe("a refusal from the plugin", () => {
  it("is shown in the sheet instead of leaving it looking frozen", () => {
    show(4.5);
    reply({
      type: "ADJUST_ACTION_FAILED",
      issueId: "contrast:1:1",
      message: "That colour no longer meets the required contrast ratio."
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "no longer meets the required contrast ratio"
    );
  });

  it("is not shown for another sheet's issue", () => {
    show(4.5);
    reply({ type: "ADJUST_ACTION_FAILED", issueId: "contrast:9:9", message: "Other" });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears when the designer picks another option", () => {
    show(4.5);
    reply({ type: "ADJUST_ACTION_FAILED", issueId: "contrast:1:1", message: "Nope" });
    fireEvent.click(screen.getByRole("button", { name: /Keep your colour/ }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
