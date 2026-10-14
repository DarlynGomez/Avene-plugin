import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IssueSummary } from "../../shared/issues/issueTypes";
import {
  ENDED_MESSAGE,
  WAITING_MESSAGE,
  participantVisibility
} from "../../shared/study/participantVisibility";
import type { StudySession } from "../../shared/study/studyTypes";
import { IssuePanel } from "../issues/IssuePanel";
import { StudyHost } from "./StudyHost";

const BASE: StudySession = {
  schemaVersion: 1,
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "post-task",
  consentConfirmedAt: "t",
  phase: "designing",
  startedAt: "t",
  revealedAt: null,
  endedAt: null,
  exports: [],
  exitedAt: null
};

const LIVE_DESIGNING: StudySession = { ...BASE, condition: "live" };
const POST_DESIGNING: StudySession = BASE;
const POST_REVIEWING: StudySession = { ...BASE, phase: "reviewing", revealedAt: "t" };
const ENDED: StudySession = { ...BASE, phase: "ended", endedAt: "t" };

function issue(overrides: Partial<IssueSummary> = {}): IssueSummary {
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

const IGNORED = issue({
  id: "contrast:2:2",
  nodeId: "2:2",
  nodeName: "Caption",
  state: "ignored",
  ignoredReason: "Brand colour",
  evidence: {
    measuredRatio: 3.1,
    requiredRatio: 4.5,
    foregroundHex: "#888888",
    backgroundHex: "#FFFFFF",
    foregroundBinding: "grey/mid"
  }
});

let posted: { type?: string; [key: string]: unknown }[];

function emit(message: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
  });
}

function studyState(session: StudySession | null) {
  emit({ type: "STUDY_STATE", session, visibility: participantVisibility(session), refusal: null });
}

function issuesUpdated(issues: IssueSummary[]) {
  emit({ type: "ISSUES_UPDATED", issues, decisions: {} });
}

function renderPanel(level = 3) {
  return render(
    <StudyHost>
      <IssuePanel aiAssistanceLevel={level} />
    </StudyHost>
  );
}

const sentTypes = () => posted.map((message) => message.type);

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

function expectFeedbackSurfaces() {
  const liveWatch = screen.getByRole("tab", { name: /Live Watch/ });
  expect(within(liveWatch).getByText("1")).toBeInTheDocument();
  expect(screen.getByText(/colours? causes? 1 of/)).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Filter issues" })).toBeInTheDocument();
  expect(screen.getByText("sage/muted on #FFFFFF")).toBeInTheDocument();
  expect(screen.getByText(/Ignored issues/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Adjust/ })).toBeInTheDocument();
  expect(screen.queryByText(WAITING_MESSAGE)).not.toBeInTheDocument();
  expect(screen.queryByText(ENDED_MESSAGE)).not.toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /Teach Me Why/ })).toBeInTheDocument();
}

function expectNoFeedbackSurfaces(message: string) {
  expect(screen.getByText(message)).toBeInTheDocument();
  expect(screen.getByText("CADT")).toBeInTheDocument();
  expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  expect(screen.queryByText("sage/muted on #FFFFFF")).not.toBeInTheDocument();
  expect(screen.queryByText(/Ignored issues/)).not.toBeInTheDocument();
  expect(screen.queryByText(/colour causes/)).not.toBeInTheDocument();
  expect(screen.queryAllByRole("button")).toEqual([]);
}

describe("participant interface, per phase", () => {
  it("live designing shows every feedback surface and the Teach Me Why tab", () => {
    renderPanel();
    studyState(LIVE_DESIGNING);
    issuesUpdated([issue(), IGNORED]);

    expectFeedbackSurfaces();
  });

  it("post-task designing shows the wordmark and the one neutral line and nothing else", () => {
    renderPanel();
    studyState(POST_DESIGNING);
    issuesUpdated([issue(), IGNORED]);

    expectNoFeedbackSurfaces(WAITING_MESSAGE);
  });

  it("post-task reviewing shows every feedback surface and the Teach Me Why tab", () => {
    renderPanel();
    studyState(POST_REVIEWING);
    issuesUpdated([issue(), IGNORED]);

    expectFeedbackSurfaces();
  });

  it("an ended block shows the ended message and no actions", () => {
    renderPanel();
    studyState(ENDED);
    issuesUpdated([issue(), IGNORED]);

    expectNoFeedbackSurfaces(ENDED_MESSAGE);
  });

  it("is unchanged with no session, Teach Me Why included", () => {
    renderPanel();
    studyState(null);
    issuesUpdated([issue(), IGNORED]);

    expect(screen.getByRole("tab", { name: /Teach Me Why/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Live Watch/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filter issues" })).toBeInTheDocument();
  });

  it("is unchanged when no study state has arrived at all", () => {
    render(<IssuePanel aiAssistanceLevel={3} />);
    issuesUpdated([issue()]);

    expect(screen.getByRole("tab", { name: /Teach Me Why/ })).toBeInTheDocument();
    expect(screen.getByText("sage/muted on #FFFFFF")).toBeInTheDocument();
  });

  it("is unrestricted again once the researcher exits", () => {
    renderPanel();
    studyState({ ...POST_DESIGNING, exitedAt: "t" });
    issuesUpdated([issue()]);

    expect(screen.getByText("sage/muted on #FFFFFF")).toBeInTheDocument();
    expect(screen.queryByText(WAITING_MESSAGE)).not.toBeInTheDocument();
  });
});

describe("post-task designing hides every count", () => {
  it("shows no count pill and no digit anywhere, however many issues arrive", () => {
    const { container } = renderPanel();
    studyState(POST_DESIGNING);
    issuesUpdated([issue(), IGNORED, issue({ id: "contrast:3:3", nodeId: "3:3" })]);

    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d/);
  });

  it("shows the count pill again in the live condition", () => {
    renderPanel();
    studyState(LIVE_DESIGNING);
    issuesUpdated([issue()]);

    expect(
      within(screen.getByRole("tab", { name: /Live Watch/ })).getByText("1")
    ).toBeInTheDocument();
  });
});

describe("detection during post-task designing", () => {
  it("updates stored state but renders nothing, then reveals what was detected so far", () => {
    const { container } = renderPanel();
    studyState(POST_DESIGNING);
    issuesUpdated([issue()]);
    expect(container.textContent).not.toContain("sage/muted");

    issuesUpdated([issue(), IGNORED]);
    expect(container.textContent).not.toContain("grey/mid");
    expect(screen.getByText(WAITING_MESSAGE)).toBeInTheDocument();

    studyState(POST_REVIEWING);

    expect(screen.getByText("sage/muted on #FFFFFF")).toBeInTheDocument();
    expect(screen.getByText(/Ignored issues \(1\)/)).toBeInTheDocument();
    expect(screen.queryByText(WAITING_MESSAGE)).not.toBeInTheDocument();
  });
});

describe("ending with a sheet open", () => {
  function openAdjustSheetWithPreview() {
    renderPanel();
    studyState(POST_REVIEWING);
    issuesUpdated([issue()]);
    fireEvent.click(screen.getByRole("button", { name: /Adjust/ }));
    emit({
      type: "ADJUST_OPTIONS_READY",
      issueId: "contrast:1:1",
      palette: [],
      binding: null,
      variableScope: null
    });
    fireEvent.click(screen.getByRole("button", { name: /Keep your colour/ }));
  }

  it("restores the preview and logs exactly one abandonment, then shows the ended message", () => {
    openAdjustSheetWithPreview();
    expect(sentTypes()).toContain("ADJUST_PREVIEW");
    posted = [];

    studyState(ENDED);

    expect(sentTypes()).toContain("ADJUST_CLEAR_PREVIEW");
    expect(sentTypes().filter((type) => type === "ADJUST_ABANDONED")).toHaveLength(1);
    expect(sentTypes()).not.toContain("ADJUST_APPLY");
    expect(screen.getByText(ENDED_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/Adjust contrast for/)).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toEqual([]);
  });

  it("logs the abandonment only once however many state messages follow", () => {
    openAdjustSheetWithPreview();
    posted = [];

    studyState(ENDED);
    studyState(ENDED);
    issuesUpdated([issue()]);

    expect(sentTypes().filter((type) => type === "ADJUST_ABANDONED")).toHaveLength(1);
  });

  it("closes an open Ignore sheet when the block ends", () => {
    renderPanel();
    studyState(POST_REVIEWING);
    issuesUpdated([issue()]);
    fireEvent.click(screen.getByRole("button", { name: /Ignore/ }));
    expect(
      screen.getByRole("dialog", { name: /Why is this contrast intentional/ })
    ).toBeInTheDocument();

    studyState(ENDED);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(ENDED_MESSAGE)).toBeInTheDocument();
  });
});
