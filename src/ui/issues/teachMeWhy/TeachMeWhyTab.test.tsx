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

// One approved Quick text for the finding in these tests, in the stored shape: a headline, a blank line, dashed bullets
vi.mock("../../../shared/teachMeWhy/explanationTableData", () => ({
  EXPLANATION_TABLE: {
    fallbacks: {
      "1": { text: "Fallback quick.", status: "fallback", reviewer: null, factIds: [] }
    },
    entries: {
      "unknown:high:normal:1": {
        text: "Move the colors of this text much further apart.\n\n- First idea.\n- Second idea.\n- Third idea.",
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

const EXITED: StudySession = { ...LIVE, phase: "ended", endedAt: "t", exitedAt: "t" };
const DEEP_DIVE = { name: "Deep dive into this rule" };

describe("Teach Me Why tab", () => {
  it("opens from the black button in the Why this surfaced box on the Quick text, with no depth choices", async () => {
    const user = userEvent.setup();
    open();
    await goToExplanation(user);
    expect(screen.getByRole("tab", { name: /Teach Me Why/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Quick|Why it matters|idea behind/ })).toBeNull();
  });

  it("shows the Quick text as a paragraph and a list of three, with the AI label and no numbers line", async () => {
    const user = userEvent.setup();
    open();
    await goToExplanation(user);
    const card = screen.getByRole("region", { name: "Explanation" });
    expect(card.querySelectorAll("p")).toHaveLength(2);
    expect(card.querySelectorAll("ul")).toHaveLength(1);
    expect(card.querySelectorAll("li")).toHaveLength(3);
    expect(
      screen.getByText("Move the colors of this text much further apart.")
    ).toBeInTheDocument();
    expect(screen.getByText(AI_LABEL)).toBeInTheDocument();
    expect(screen.queryByText(/Based on:/)).not.toBeInTheDocument();
    expect(screen.queryByText("2.17:1 now, 4.5:1 needed")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("has Back to issue as its own control above the card, and it returns to the Live Watch card", async () => {
    const user = userEvent.setup();
    open();
    await goToExplanation(user);
    const card = screen.getByRole("region", { name: "Explanation" });
    const back = screen.getByRole("button", { name: "Back to issue" });
    expect(card.contains(back)).toBe(false);
    expect(back.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await user.click(back);
    expect(screen.getByRole("tab", { name: /Live Watch/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("button", { name: "Ignore" })).toBeInTheDocument();
  });

  describe("the deep dive", () => {
    it("is one control at the bottom right of the card when no session is active, with a decorative arrow", async () => {
      const user = userEvent.setup();
      open(null);
      await goToExplanation(user);
      const card = screen.getByRole("region", { name: "Explanation" });
      const controls = within(card).getAllByRole("button", DEEP_DIVE);
      expect(controls).toHaveLength(1);
      expect(controls[0].querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      const actions = controls[0].parentElement as HTMLElement;
      expect(actions.firstElementChild).toBe(within(card).getByRole("button", { name: "Dismiss" }));
      expect(actions.lastElementChild).toBe(controls[0]);
    });

    it("is not rendered at all while a session is active, and Dismiss stays", async () => {
      const user = userEvent.setup();
      open(LIVE);
      await goToExplanation(user);
      expect(screen.queryByRole("button", DEEP_DIVE)).not.toBeInTheDocument();
      const actions = screen.getByRole("button", { name: "Dismiss" }).parentElement as HTMLElement;
      expect(actions.children).toHaveLength(1);
    });

    it("stays off for an ended block that has not been exited, and comes back once exited", async () => {
      const user = userEvent.setup();
      open({ ...LIVE, phase: "ended", endedAt: "t" });
      expect(screen.queryByRole("tab", { name: /Teach Me Why/ })).not.toBeInTheDocument();
      cleanup();
      open(POST_REVIEWING);
      await goToExplanation(user);
      expect(screen.queryByRole("button", DEEP_DIVE)).not.toBeInTheDocument();
      cleanup();
      open(EXITED);
      await goToExplanation(user);
      expect(screen.getByRole("button", DEEP_DIVE)).toBeInTheDocument();
    });

    it("opens the lesson with focus on its heading, and Escape puts focus back on the control", async () => {
      const user = userEvent.setup();
      open(null);
      await goToExplanation(user);
      await user.click(screen.getByRole("button", DEEP_DIVE));

      const heading = screen.getByRole("heading", { name: "Why Text Contrast Matters" });
      expect(heading).toHaveFocus();
      expect(screen.getByRole("region", { name: "Lesson" })).toBeInTheDocument();
      expect(screen.queryByRole("button", DEEP_DIVE)).not.toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(screen.getByRole("button", DEEP_DIVE)).toHaveFocus();
    });

    it("puts focus back on the control after the All topics button too", async () => {
      const user = userEvent.setup();
      open(null);
      await goToExplanation(user);
      await user.click(screen.getByRole("button", DEEP_DIVE));
      await user.click(screen.getByRole("button", { name: "All topics" }));
      expect(screen.getByRole("button", DEEP_DIVE)).toHaveFocus();
      expect(screen.getByRole("tablist", { name: "Topic categories" })).toBeInTheDocument();
    });

    it("shows the lesson as text only, with no video and no article link", async () => {
      const user = userEvent.setup();
      open(null);
      await goToExplanation(user);
      await user.click(screen.getByRole("button", DEEP_DIVE));
      expect(screen.queryByRole("region", { name: "Video" })).not.toBeInTheDocument();
      expect(document.querySelector("iframe")).toBeNull();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.queryByText(/quiz/i)).not.toBeInTheDocument();
    });
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

  it("dismisses an AI explanation and its label, and brings them back", async () => {
    const user = userEvent.setup();
    open();
    await goToExplanation(user);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Move the colors of this text much further apart.")).toBeNull();
    expect(screen.queryByText(AI_LABEL)).not.toBeInTheDocument();
    expect(screen.getByText("This explanation is hidden.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show again" }));
    expect(
      screen.getByText("Move the colors of this text much further apart.")
    ).toBeInTheDocument();
    expect(events("dismissed")).toHaveLength(1);
  });

  it("shows the topic library without an empty issue prompt", async () => {
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("tab", { name: /Teach Me Why/ }));
    expect(screen.getByRole("region", { name: "Accessibility topics" })).toBeInTheDocument();
    expect(screen.queryByText("Pick an issue to see why it matters.")).not.toBeInTheDocument();
    expect(events("opened")).toHaveLength(0);
  });

  it("logs the key and source on open and each dismissal, always on depth 1, and never a depth change", async () => {
    const user = userEvent.setup();
    open();
    await goToExplanation(user);
    const key = { role: "unknown", severity: "high", size: "normal", depth: 1 };
    expect(events("opened")).toEqual([
      { type: "EXPLANATION_EVENT", event: { kind: "opened", key, source: "card" } }
    ]);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(events("dismissed")).toEqual([
      { type: "EXPLANATION_EVENT", event: { kind: "dismissed", key } }
    ]);

    await user.click(screen.getByRole("button", { name: "Back to issue" }));
    await user.click(screen.getByRole("tab", { name: /Teach Me Why/ }));
    expect(events("opened")[1]).toMatchObject({ event: { kind: "opened", source: "tab" } });
    for (const message of posted.filter((m) => m.type === "EXPLANATION_EVENT")) {
      const event = message.event as { kind: string; key?: { depth: number } };
      expect(event.kind).not.toBe("depth_changed");
      expect(event.key?.depth).toBe(1);
    }
    expect(events("depth_changed")).toHaveLength(0);
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
