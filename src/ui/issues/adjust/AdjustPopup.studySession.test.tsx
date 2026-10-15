import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Root } from "../../../shared/grouping/groupingTypes";
import type { IssueSummary } from "../../../shared/issues/issueTypes";
import { STUDY_AI_ASSISTANCE_LEVEL } from "../../../shared/study/studyProfile";
import { AdjustPopup } from "./AdjustPopup";

// The flag is forced on so only the sandbox's session rule can hide the variable option
vi.mock("../../../shared/featureFlags", () => ({ FEATURE_VARIABLE_SCOPE: true }));

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

function reply(variableScope: unknown) {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        pluginMessage: {
          type: "ADJUST_OPTIONS_READY",
          issueId: ISSUE.id,
          palette: [{ color: { r: 0, g: 0, b: 0.3 }, name: "ink/deep" }],
          binding: null,
          variableScope
        }
      }
    })
  );
}

describe("AdjustPopup during a study session", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows all three options and no variable scope at the fixed involvement level", async () => {
    vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
    render(
      <AdjustPopup
        root={ROOT}
        representativeIssue={ISSUE}
        selectedInstanceIds={new Set()}
        aiAssistanceLevel={STUDY_AI_ASSISTANCE_LEVEL}
        onClose={vi.fn()}
      />
    );

    // The sandbox sends no variable scope while a session is active
    await act(async () => reply(null));

    expect(screen.getByText("Keep your color")).toBeInTheDocument();
    expect(screen.getByText("From your file")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose your own/i })).toBeInTheDocument();
    expect(screen.queryByText(/Update variable/)).not.toBeInTheDocument();
  });
});
