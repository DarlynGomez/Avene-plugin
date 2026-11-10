import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IssueSummary } from "../../shared/issues/issueTypes";
import { AltChecksProvider } from "../handoff/alt/AltChecksProvider";
import { IssuePanel } from "./IssuePanel";

vi.mock("../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../shared/handoffFlags")>()),
  FEATURE_HANDOFF: false
}));

function emit(message: unknown) {
  window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
}

const issue = (id: string, node: string): IssueSummary => ({
  id,
  ruleId: "contrast",
  nodeId: node,
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
  }
});

async function html(withProvider: boolean): Promise<string> {
  const panel = <IssuePanel aiAssistanceLevel={1} />;
  const { container, unmount } = render(
    withProvider ? <AltChecksProvider>{panel}</AltChecksProvider> : panel
  );
  await act(async () => {
    emit({
      type: "ISSUES_UPDATED",
      issues: [issue("contrast:1:1", "1:1"), issue("contrast:1:2", "1:2")],
      decisions: {}
    });
  });
  // React numbers its generated ids across renders, so the numbers are not part of the comparison
  const out = container.innerHTML.replace(/_r_\d+_/g, "_r_N_");
  unmount();
  return out;
}

describe("with handoff off, the panel with the alt text checks in place", () => {
  let posted: unknown[];
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

  it("renders the same page, byte for byte, as without them", async () => {
    const without = await html(false);
    const withChecks = await html(true);
    expect(withChecks).toBe(without);
    expect(withChecks).not.toContain("All checks");
  });

  it("asks the plugin for nothing from this feature", async () => {
    await html(true);
    const types = posted.map((m) => (m as { type: string }).type);
    expect(types.filter((t) => t.startsWith("HANDOFF"))).toEqual([]);
  });
});
