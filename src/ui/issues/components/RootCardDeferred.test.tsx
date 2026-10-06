import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Root } from "../../../shared/grouping/groupingTypes";
import { RootCard } from "./RootCard";

function root(displayState: Root["displayState"]): Root {
  const instance = {
    issueId: "contrast:1:1",
    nodeId: "1:1",
    nodeName: "Coral banner",
    screenId: "screen:1",
    screenName: "Home",
    state: "open" as const,
    severity: "medium" as const,
    measuredRatio: 3.31,
    requiredRatio: 4.5,
    foregroundHex: "#FFFFFF",
    backgroundHex: "#FF6B4A",
    foregroundBinding: null,
    backgroundBinding: null,
    documentOrder: 0
  };
  return {
    signature: "sig",
    foregroundHex: "#FFFFFF",
    backgroundHex: "#FF6B4A",
    foregroundBinding: null,
    requiredRatio: 4.5,
    instances: [instance],
    representativeIssueId: instance.issueId,
    backgroundBindings: [],
    displayState,
    stateBreakdown: { open: 1 }
  };
}

function renderCard(displayState: Root["displayState"]) {
  const noop = vi.fn();
  render(
    <ul>
      <RootCard
        root={root(displayState)}
        representativeIssue={undefined}
        canAdjust={false}
        decisionOffer={{ offered: false, decision: null, reason: "no-match" }}
        recordedReason={null}
        selectedInstanceIds={new Set()}
        onToggleInstanceSelected={noop}
        onSelectAllInstances={noop}
        onShowOnCanvas={noop}
        onLocate={noop}
        onAdjust={noop}
        onIgnore={noop}
        onDefer={noop}
        onToggleImportant={noop}
        onApplyDecisionOffer={noop}
        onRestoreDeferred={noop}
      />
    </ul>
  );
}

function appliedOpacities(element: HTMLElement): string[] {
  const values: string[] = [];
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    values.push(getComputedStyle(node).opacity);
  }
  return values;
}

describe("RootCard deferred", () => {
  afterEach(cleanup);

  it("shows the Deferred word and the restore control", () => {
    renderCard("deferred");

    expect(screen.getByText("Deferred")).toBeVisible();
    expect(screen.getByRole("button", { name: /bring back/i })).toBeInTheDocument();
  });

  it.each([
    ["the name", () => screen.getByRole("heading", { level: 3 })],
    ["the Deferred word", () => screen.getByText("Deferred")],
    ["the Adjust area buttons", () => screen.getByRole("button", { name: /ignore/i })]
  ])("applies no opacity to %s or any ancestor", (_label, find) => {
    renderCard("deferred");

    for (const value of appliedOpacities(find())) {
      expect(["", "1"]).toContain(value);
    }
  });
});
