import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IssueSummary } from "../../shared/issues/issueTypes";
import { IssuePanel } from "./IssuePanel";

function emit(message: unknown) {
  window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
}

const issue = (id: string, node: string, name: string): IssueSummary => ({
  id,
  ruleId: "contrast",
  nodeId: node,
  nodeName: name,
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

async function html(issues: IssueSummary[]): Promise<string> {
  const { container } = render(<IssuePanel aiAssistanceLevel={1} />);
  await act(async () => {
    emit({ type: "ISSUES_UPDATED", issues, decisions: {} });
  });
  return container.innerHTML;
}

describe("the Live Watch contrast view with the alt text checks off", () => {
  beforeEach(() => {
    vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders exactly what it did before the alt text checks existed", async () => {
    expect(
      await html([issue("contrast:1:1", "1:1", "Body copy"), issue("contrast:1:2", "1:2", "Footer")])
    ).toMatchSnapshot();
  });

  it("renders the empty panel exactly as before", async () => {
    expect(await html([])).toMatchSnapshot();
  });

  it("has no check dropdown and no alt text section", async () => {
    const out = await html([issue("contrast:1:1", "1:1", "Body copy")]);
    expect(out).not.toContain("Alt text");
    expect(out).not.toContain("All checks");
  });
});
