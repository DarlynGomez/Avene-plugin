import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IssueSummary } from "../../shared/issues/issueTypes";
import { IssuePanel } from "./IssuePanel";

function emit(message: unknown) {
  window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
}

function layer(node: string, name: string, screenNumber: number): IssueSummary {
  return {
    id: `contrast:${node}`,
    ruleId: "contrast",
    nodeId: node,
    nodeName: name,
    screenId: `screen-${screenNumber}`,
    screenName: `Frame ${screenNumber === 1 ? "A" : "B"}`,
    state: "open",
    severityAtLastDetection: "high",
    encounterCount: 0,
    lastDetectedAt: "2026-09-08T00:00:00.000Z",
    evidence: {
      measuredRatio: 2.17,
      requiredRatio: 4.5,
      foregroundHex: "#9CB5B1",
      backgroundHex: "#FFFFFF",
      foregroundBinding: null
    }
  };
}

/** What the plugin sends once a layer is fixed, a new color, so it leaves the old group */
function fixed(issue: IssueSummary): IssueSummary {
  return {
    ...issue,
    state: "resolved",
    evidence: {
      ...(issue.evidence as Record<string, unknown>),
      measuredRatio: 4.6,
      foregroundHex: "#5F7470"
    }
  } as IssueSummary;
}

const TITLE_A = layer("1:1", "Title A", 1);
const BODY_B = layer("2:1", "Body B", 2);
const NOTE_B = layer("2:2", "Note B", 2);

let posted: { type?: string; issueIds?: string[] }[] = [];

async function issues(list: IssueSummary[]) {
  await act(async () => emit({ type: "ISSUES_UPDATED", issues: list, decisions: {} }));
}

async function previewFrom(scope: HTMLElement, representativeId: string) {
  fireEvent.click(within(scope).getByRole("button", { name: /Adjust/ }));
  await act(async () =>
    emit({
      type: "ADJUST_OPTIONS_READY",
      issueId: representativeId,
      palette: [],
      binding: null,
      variableScope: null
    })
  );
  fireEvent.click(screen.getByRole("button", { name: /Keep your color/ }));
  return posted.filter((m) => m.type === "ADJUST_PREVIEW").at(-1)?.issueIds;
}

beforeEach(() => {
  posted = [];
  vi.spyOn(window.parent, "postMessage").mockImplementation((message) => {
    posted.push((message as { pluginMessage: { type?: string } }).pluginMessage);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Adjust aims only at the layers ticked now", () => {
  it("drops the tick on a layer already fixed, so the next Adjust touches only the new pick", async () => {
    render(<IssuePanel aiAssistanceLevel={3} />);
    await issues([TITLE_A, BODY_B, NOTE_B]);
    fireEvent.click(screen.getByText("Related grouped issues"));
    fireEvent.click(screen.getByRole("checkbox", { name: /Body B/ }));
    expect(await previewFrom(document.body, TITLE_A.id)).toEqual([BODY_B.id]);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await act(async () => emit({ type: "ADJUST_APPLIED", issueId: TITLE_A.id }));
    await issues([TITLE_A, fixed(BODY_B), NOTE_B]);

    if (!screen.queryByRole("checkbox", { name: /Note B/ })) {
      fireEvent.click(screen.getByText("Related grouped issues"));
    }
    expect(screen.getByText("0 of 2 selected for Adjust")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /Note B/ }));
    expect(screen.getByText("1 of 2 selected for Adjust")).toBeInTheDocument();
    expect(await previewFrom(document.body, TITLE_A.id)).toEqual([NOTE_B.id]);
  });

  it("does not bring a fixed layer back ticked when it reopens", async () => {
    render(<IssuePanel aiAssistanceLevel={3} />);
    await issues([TITLE_A, BODY_B]);
    fireEvent.click(screen.getByText("Related grouped issues"));
    fireEvent.click(screen.getByRole("checkbox", { name: /Body B/ }));
    await issues([TITLE_A, fixed(BODY_B)]);
    await issues([TITLE_A, BODY_B]);

    if (!screen.queryByRole("checkbox", { name: /Body B/ })) {
      fireEvent.click(screen.getByText("Related grouped issues"));
    }
    expect(screen.getByRole("checkbox", { name: /Body B/ })).not.toBeChecked();
  });

  it("aims a card in a screen section at its own frame, not the same color in another", async () => {
    render(<IssuePanel aiAssistanceLevel={3} />);
    await issues([TITLE_A, BODY_B]);
    fireEvent.click(screen.getByRole("radio", { name: "Screen" }));

    const frameB = screen.getByRole("button", { name: /Frame B/ }).closest("section");
    expect(frameB).not.toBeNull();
    expect(await previewFrom(frameB as HTMLElement, BODY_B.id)).toEqual([BODY_B.id]);
    expect(screen.getByText(/Adjust contrast for “Body B”/)).toBeInTheDocument();
  });
});
