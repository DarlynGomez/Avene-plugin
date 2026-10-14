import { act, cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IssueSummary } from "../../../shared/issues/issueTypes";
import { participantVisibility } from "../../../shared/study/participantVisibility";
import type { StudySession } from "../../../shared/study/studyTypes";
import { StudyHost } from "../../study/StudyHost";
import { IssuePanel } from "../IssuePanel";
import { AI_LABEL } from "./ExplanationCard";

// Quick has no entry so it falls back, Why it matters used a fact, the idea behind it used none
vi.mock("../../../shared/teachMeWhy/explanationTableData", () => ({
  EXPLANATION_TABLE: {
    fallbacks: {
      "1": {
        text: "Fallback quick {measured} needs {required}.",
        status: "fallback",
        reviewer: null,
        factIds: []
      },
      "2": { text: "Fallback mid.", status: "fallback", reviewer: null, factIds: [] },
      "3": { text: "Fallback deep.", status: "fallback", reviewer: null, factIds: [] }
    },
    entries: {
      "unknown:high:normal:2": {
        text: "Mid words at {measured} against {required}.",
        status: "approved",
        reviewer: "DG",
        factIds: ["F15", "F01"]
      },
      "unknown:high:normal:3": {
        text: "Deep words with no facts.",
        status: "approved",
        reviewer: "DG",
        factIds: []
      }
    }
  }
}));

const LIVE: StudySession = {
  schemaVersion: 1,
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  consentConfirmedAt: "t",
  phase: "designing",
  startedAt: "t",
  revealedAt: null,
  endedAt: null,
  exports: [],
  exitedAt: null
};
const POST_DESIGNING: StudySession = { ...LIVE, condition: "post-task" };
const POST_REVIEWING: StudySession = { ...POST_DESIGNING, phase: "reviewing", revealedAt: "t" };

function issue(): IssueSummary {
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
    }
  };
}

let posted: { type?: string; [key: string]: unknown }[];

function emit(message: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
  });
}

function open(session: StudySession | null = LIVE) {
  render(
    <StudyHost>
      <IssuePanel aiAssistanceLevel={3} />
    </StudyHost>
  );
  emit({ type: "STUDY_STATE", session, visibility: participantVisibility(session), refusal: null });
  emit({ type: "ISSUES_UPDATED", issues: [issue()], decisions: {} });
}

const events = (kind: string) =>
  posted.filter(
    (m) => m.type === "EXPLANATION_EVENT" && (m.event as { kind: string }).kind === kind
  );

const scrollIntoView = vi.fn();

beforeEach(() => {
  posted = [];
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
  vi.spyOn(window.parent, "postMessage").mockImplementation((data: unknown) => {
    const message = (data as { pluginMessage?: { type?: string } }).pluginMessage;
    if (message) posted.push(message);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function goToExplanation(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Why this surfaced" }));
  await user.click(screen.getByRole("button", { name: "Why this matters" }));
}

describe("Teach Me Why tab", () => {
  it("opens from the black button in the Why this surfaced box with Quick chosen", async () => {
    const user = userEvent.setup();
    open();
    await goToExplanation(user);
    expect(screen.getByRole("radio", { name: "Quick" })).toBeChecked();
    expect(screen.getByRole("tab", { name: /Teach Me Why/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("shows a fixed template with the measured values and no AI label for a missing key", async () => {
    const user = userEvent.setup();
    open();
    await goToExplanation(user);
    expect(screen.getByText("Fallback quick 2.17:1 needs 4.5:1.")).toBeInTheDocument();
    expect(screen.queryByText(AI_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText(/Based on:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hide this explanation" })).not.toBeInTheDocument();
  });

  it("carries the AI label with every AI explanation, and Based on only when facts were used", async () => {
    const user = userEvent.setup();
    open();
    await goToExplanation(user);

    await user.click(screen.getByRole("radio", { name: "Why it matters" }));
    expect(screen.getByText("Mid words at 2.17:1 against 4.5:1.")).toBeInTheDocument();
    expect(screen.getByText(AI_LABEL)).toBeInTheDocument();
    expect(
      screen.getByText(
        "Based on: WebAIM, The WebAIM Million 2026, WebAIM Contrast and Color Accessibility, W3C"
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Explanation" }).querySelector("a")).toBeNull();

    await user.click(screen.getByRole("radio", { name: "The idea behind it" }));
    expect(screen.getByText("Deep words with no facts.")).toBeInTheDocument();
    expect(screen.getByText(AI_LABEL)).toBeInTheDocument();
    expect(screen.queryByText(/Based on:/)).not.toBeInTheDocument();
  });

  it("shows the contrast label and the ratio at opposite ends of the box", async () => {
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("button", { name: "Why this surfaced" }));
    const line = screen.getByText("Contrast ratio").parentElement;
    expect(line?.children).toHaveLength(2);
    expect(line?.lastElementChild).toHaveTextContent("2.17:1 / req 4.5:1");
    expect(screen.queryByRole("link", { name: "Why this matters" })).not.toBeInTheDocument();
  });

  it("names the issue and its values in a line with a Back to issue button", async () => {
    const user = userEvent.setup();
    open();
    await goToExplanation(user);
    expect(screen.getByText("sage/muted on #FFFFFF")).toBeInTheDocument();
    expect(screen.getByText("2.17:1 now, 4.5:1 needed")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to issue" }));
    expect(screen.getByRole("tab", { name: /Live Watch/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("moves between the three depths with the arrow keys", async () => {
    const user = userEvent.setup();
    open();
    await goToExplanation(user);
    const group = screen.getByRole("radiogroup");
    expect(
      within(group)
        .getAllByRole("radio")
        .map((r) => r.getAttribute("value"))
    ).toEqual(["1", "2", "3"]);
    screen.getByRole("radio", { name: "Quick" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Why it matters" })).toBeChecked();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "The idea behind it" })).toBeChecked();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Why it matters" })).toBeChecked();
  });

  it("hides an AI explanation and its label, and brings them back", async () => {
    const user = userEvent.setup();
    open();
    await goToExplanation(user);
    await user.click(screen.getByRole("radio", { name: "The idea behind it" }));
    await user.click(screen.getByRole("button", { name: "Hide this explanation" }));
    expect(screen.queryByText("Deep words with no facts.")).not.toBeInTheDocument();
    expect(screen.queryByText(AI_LABEL)).not.toBeInTheDocument();
    expect(screen.getByText("This explanation is hidden.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show again" }));
    expect(screen.getByText("Deep words with no facts.")).toBeInTheDocument();
    expect(events("dismissed")).toHaveLength(1);
  });

  it("shows one plain line, not a library, when opened with nothing chosen", async () => {
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("tab", { name: /Teach Me Why/ }));
    expect(screen.getByText("Pick an issue to see why it matters.")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(events("opened")).toHaveLength(0);
  });

  it("logs the key and source on open, the depth after a change, and each hide", async () => {
    const user = userEvent.setup();
    open();
    await goToExplanation(user);
    const key = { role: "unknown", severity: "high", size: "normal", depth: 1 };
    expect(events("opened")).toEqual([
      { type: "EXPLANATION_EVENT", event: { kind: "opened", key, source: "card" } }
    ]);

    await user.click(screen.getByRole("radio", { name: "Why it matters" }));
    expect(events("depth_changed")).toEqual([
      { type: "EXPLANATION_EVENT", event: { kind: "depth_changed", key, toDepth: 2 } }
    ]);
    await user.click(screen.getByRole("radio", { name: "Why it matters" }));
    expect(events("depth_changed")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Hide this explanation" }));
    expect(events("dismissed")).toEqual([
      { type: "EXPLANATION_EVENT", event: { kind: "dismissed", key: { ...key, depth: 2 } } }
    ]);

    await user.click(screen.getByRole("button", { name: "Back to issue" }));
    await user.click(screen.getByRole("tab", { name: /Teach Me Why/ }));
    expect(events("opened")[1]).toMatchObject({ event: { kind: "opened", source: "tab" } });
  });
});

describe("Teach Me Why in a study session", () => {
  it("renders nothing for it during post-task designing", () => {
    open(POST_DESIGNING);
    expect(screen.queryByRole("tab", { name: /Teach Me Why/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Why this surfaced" })).not.toBeInTheDocument();
    expect(screen.getByText("Feedback will appear when you finish designing.")).toBeInTheDocument();
  });

  it("shows it live and after the reveal", async () => {
    const user = userEvent.setup();
    open(LIVE);
    await user.click(screen.getByRole("button", { name: "Why this surfaced" }));
    expect(screen.getByRole("button", { name: "Why this matters" })).toBeInTheDocument();
    cleanup();
    open(POST_REVIEWING);
    expect(screen.getByRole("tab", { name: /Teach Me Why/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Why this surfaced" }));
    expect(screen.getByRole("button", { name: "Why this matters" })).toBeInTheDocument();
  });

  it("renders nothing for it once the block has ended", () => {
    open({ ...LIVE, phase: "ended", endedAt: "t" });
    expect(screen.queryByRole("tab", { name: /Teach Me Why/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Why this surfaced" })).not.toBeInTheDocument();
  });
});
