import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Root, RootDecision } from "../../../shared/grouping/groupingTypes";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
import { buildRootSignature } from "../../../shared/issues/rootSignature";
import { ToReviewList } from "./ToReviewList";

const SIGNATURE = buildRootSignature({
  foregroundHex: "#FFFFFF",
  backgroundHex: "#FF6B4A",
  foregroundBinding: null,
  requiredRatio: 4.5
});
const DECISION: RootDecision = {
  signature: SIGNATURE,
  reason: "Brand color, accepted",
  recordedAt: "2026-09-08T00:00:00.000Z",
  severityAtDecision: "medium"
};

function openRoot(stateBreakdown: Root["stateBreakdown"]): Root {
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
    signature: SIGNATURE,
    foregroundHex: "#FFFFFF",
    backgroundHex: "#FF6B4A",
    foregroundBinding: null,
    requiredRatio: 4.5,
    instances: [instance],
    representativeIssueId: instance.issueId,
    backgroundBindings: [],
    displayState: "open",
    stateBreakdown
  };
}

function renderList(root: Root) {
  const noop = vi.fn();
  render(
    <ToReviewList
      sections={[{ key: "all", label: "", roots: [root] }]}
      issuesById={new Map<string, IssueSummary>()}
      decisions={{ [SIGNATURE]: DECISION }}
      ignoredRoots={[]}
      onRestoreIgnored={noop}
      canAdjust={false}
      selectedInstances={{}}
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
  );
}

describe("ToReviewList decision offer", () => {
  afterEach(cleanup);

  it("offers a recorded decision on an open root with no ignored instances", () => {
    renderList(openRoot({ open: 1 }));

    expect(screen.getByText(/Matches your earlier decision/)).toBeInTheDocument();
  });

  it("does not offer a recorded decision while the root still has ignored instances", () => {
    renderList(openRoot({ open: 1, ignored: 1 }));

    expect(screen.queryByText(/Matches your earlier decision/)).not.toBeInTheDocument();
  });
});
