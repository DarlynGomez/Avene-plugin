import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Root } from "../../../shared/grouping/groupingTypes";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
import { AdjustPopup } from "./AdjustPopup";

// featureFlags is not mocked in this file so it shows what the shipped default renders

const ISSUE: IssueSummary = {
  id: "contrast:1:1",
  ruleId: "contrast",
  nodeId: "1:1",
  nodeName: "Body copy",
  state: "open",
  severityAtLastDetection: "high",
  encounterCount: 0,
  lastDetectedAt: "2026-09-08T00:00:00.000Z",
  evidence: {
    measuredRatio: 2.0,
    requiredRatio: 4.5,
    foregroundHex: "#AAAAAA",
    backgroundHex: "#FFFFFF"
  }
};

const ROOT: Root = {
  signature: "sig:1",
  foregroundHex: "#AAAAAA",
  backgroundHex: "#FFFFFF",
  foregroundBinding: null,
  requiredRatio: 4.5,
  instances: [],
  representativeIssueId: ISSUE.id,
  backgroundBindings: [],
  displayState: "open",
  stateBreakdown: { open: 1 }
};

describe("AdjustPopup with the shipped default", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders no variable option, no scope section, and sends no variable request", async () => {
    const post = vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
    render(
      <AdjustPopup
        root={ROOT}
        representativeIssue={ISSUE}
        selectedInstanceIds={new Set()}
        aiAssistanceLevel={3}
        onClose={vi.fn()}
      />
    );

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            pluginMessage: {
              type: "ADJUST_OPTIONS_READY",
              issueId: ISSUE.id,
              palette: [],
              binding: null,
              variableScope: {
                variableId: "VariableID:1:1",
                name: "sage/muted",
                collectionName: "Brand colors",
                modeName: "Default",
                remote: false
              }
            }
          }
        })
      );
    });

    expect(screen.queryByText(/Update variable/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Choose adjustment scope/)).not.toBeInTheDocument();
    const sent = post.mock.calls.map(
      (call) => (call[0] as { pluginMessage: { type: string } }).pluginMessage.type
    );
    expect(sent).not.toContain("ADJUST_VARIABLE_CONSEQUENCE_REQUEST");
    expect(sent).not.toContain("ADJUST_APPLY_VARIABLE");
  });
});
