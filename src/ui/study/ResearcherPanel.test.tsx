import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { participantVisibility } from "../../shared/study/participantVisibility";
import type { StudyRefusal } from "../../shared/study/studyMessageTypes";
import type { StudySession } from "../../shared/study/studyTypes";
import { StudyHost } from "./StudyHost";

const SESSION: StudySession = {
  schemaVersion: 1,
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "post-task",
  consentConfirmedAt: "2026-10-06T09:00:00.000Z",
  phase: "designing",
  startedAt: "2026-10-06T09:00:00.000Z",
  revealedAt: null,
  endedAt: null,
  exports: [],
  exitedAt: null
};

let posted: { type?: string; [key: string]: unknown }[];

function sandboxState(session: StudySession | null, refusal: StudyRefusal | null = null) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          pluginMessage: {
            type: "STUDY_STATE",
            session,
            visibility: participantVisibility(session),
            refusal
          }
        }
      })
    );
  });
}

function chord() {
  fireEvent.keyDown(window, {
    key: "K",
    code: "KeyK",
    ctrlKey: true,
    altKey: true,
    shiftKey: true
  });
}

function openPanel(session: StudySession | null, refusal: StudyRefusal | null = null) {
  render(
    <StudyHost>
      <button type="button">Participant content</button>
    </StudyHost>
  );
  chord();
  sandboxState(session, refusal);
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

describe("researcher panel, closed", () => {
  it("is not in the accessibility tree and has nothing focusable", async () => {
    sandboxState(SESSION);
    render(
      <StudyHost>
        <button type="button">Participant content</button>
      </StudyHost>
    );
    sandboxState(SESSION);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Researcher controls")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start block" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Participant P01/)).not.toBeInTheDocument();
    expect(screen.queryByText(/post-task/)).not.toBeInTheDocument();

    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Participant content" })).toHaveFocus();
    await userEvent.tab();
    expect(document.body).toHaveFocus();
  });

  it("asks the sandbox for its state without showing anything", () => {
    render(<StudyHost>content</StudyHost>);

    expect(sentTypes()).toContain("STUDY_SUBSCRIBE");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("researcher panel, opening and closing", () => {
  it("opens with Ctrl + Alt + Shift + K and closes with the same chord", () => {
    openPanel(null);

    expect(screen.getByRole("dialog", { name: "Researcher controls" })).toBeInTheDocument();
    chord();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not open for a partial chord", () => {
    render(<StudyHost>content</StudyHost>);
    fireEvent.keyDown(window, { key: "K", code: "KeyK", ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(window, {
      key: "K",
      code: "KeyK",
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
      metaKey: true
    });
    fireEvent.keyDown(window, { key: "k", code: "KeyK" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes with Escape and leaves nothing behind", () => {
    openPanel(null);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Researcher controls")).not.toBeInTheDocument();
  });

  it("closes with the Close button and returns focus to where it was", async () => {
    render(
      <StudyHost>
        <button type="button">Participant content</button>
      </StudyHost>
    );
    screen.getByRole("button", { name: "Participant content" }).focus();
    chord();
    sandboxState(null);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Participant content" })).toHaveFocus();
  });

  it("asks for fresh state every time it opens", () => {
    render(<StudyHost>content</StudyHost>);
    posted = [];
    chord();

    expect(sentTypes()).toContain("STUDY_SUBSCRIBE");
  });

  it("moves focus into the panel and keeps Tab inside it", async () => {
    openPanel(null);

    expect(screen.getByRole("dialog")).toHaveFocus();
    for (let i = 0; i < 12; i++) await userEvent.tab();
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
  });
});

describe("start form", () => {
  async function fillValid(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Participant ID"), "P07");
    await user.selectOptions(screen.getByLabelText("Block"), "2");
    await user.selectOptions(screen.getByLabelText("Task"), "B");
    await user.selectOptions(screen.getByLabelText("Condition"), "post-task");
  }

  it("keeps Start disabled until every field is set and consent is ticked", async () => {
    const user = userEvent.setup();
    openPanel(null);
    const start = screen.getByRole("button", { name: "Start block" });

    expect(start).toBeDisabled();
    await fillValid(user);
    expect(start).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Paper consent signed" }));
    expect(start).toBeEnabled();
  });

  it("keeps Start disabled for a malformed participant ID even with consent", async () => {
    const user = userEvent.setup();
    openPanel(null);
    await fillValid(user);
    await user.click(screen.getByRole("checkbox", { name: "Paper consent signed" }));
    await user.clear(screen.getByLabelText("Participant ID"));
    await user.type(screen.getByLabelText("Participant ID"), "P 07");

    expect(screen.getByRole("button", { name: "Start block" })).toBeDisabled();
    expect(screen.getByText(/no spaces/)).toBeInTheDocument();
  });

  it("sends the form, with consent, when Start is pressed", async () => {
    const user = userEvent.setup();
    openPanel(null);
    await fillValid(user);
    await user.click(screen.getByRole("checkbox", { name: "Paper consent signed" }));
    await user.click(screen.getByRole("button", { name: "Start block" }));

    expect(posted.at(-1)).toEqual({
      type: "STUDY_START_BLOCK",
      participantId: "P07",
      block: 2,
      task: "B",
      condition: "post-task",
      paperConsentSigned: true
    });
  });

  it("uses real labelled controls with the 44 pixel target token", () => {
    openPanel(null);
    const targets = [
      screen.getByLabelText("Participant ID"),
      screen.getByLabelText("Block"),
      screen.getByLabelText("Task"),
      screen.getByLabelText("Condition"),
      screen.getByRole("button", { name: "Start block" }),
      screen.getByRole("button", { name: "Close" })
    ];

    for (const target of targets) {
      expect(getComputedStyle(target).minHeight).toBe("var(--size-target-min)");
    }
    const consentRow = screen.getByText("Paper consent signed").closest("label");
    expect(consentRow).not.toBeNull();
    expect(getComputedStyle(consentRow as HTMLElement).minHeight).toBe("var(--size-target-min)");
  });
});

describe("refusals", () => {
  it("shows a refusal in plain words in an alert", () => {
    const reason = "This file already has recorded decisions. Use a fresh copy of the task file.";
    openPanel(null, { code: "not-fresh", reason });

    expect(screen.getByRole("alert")).toHaveTextContent(reason);
  });

  it("explains a failed save and says nothing changed", () => {
    openPanel(SESSION, { code: "save-failed", reason: "entry too large" });

    expect(screen.getByRole("alert")).toHaveTextContent(/nothing was changed.*entry too large/);
  });

  it("shows no alert when there is no refusal", () => {
    openPanel(null);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("block controls", () => {
  it("shows the current session line only inside the open panel", () => {
    openPanel(SESSION);

    expect(screen.getByRole("region", { name: "Current session" })).toHaveTextContent(
      "Participant P01, block 1, task A, post-task, designing"
    );
  });

  it("has no Reveal control in the live condition, only End", () => {
    openPanel({ ...SESSION, condition: "live" });

    expect(screen.queryByRole("button", { name: "Reveal feedback" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End block" })).toBeInTheDocument();
  });

  it("offers Reveal and not End in post-task designing", () => {
    openPanel(SESSION);

    expect(screen.getByRole("button", { name: "Reveal feedback" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End block" })).not.toBeInTheDocument();
  });

  it("offers End and not Reveal in post-task reviewing", () => {
    openPanel({ ...SESSION, phase: "reviewing", revealedAt: "2026-10-06T09:20:00.000Z" });

    expect(screen.queryByRole("button", { name: "Reveal feedback" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End block" })).toBeInTheDocument();
  });

  it("offers neither Reveal nor End once the block has ended", () => {
    openPanel({ ...SESSION, phase: "ended", endedAt: "2026-10-06T09:40:00.000Z" });

    expect(screen.queryByRole("button", { name: "Reveal feedback" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End block" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export block" })).toBeInTheDocument();
  });

  it("asks once before Reveal, says it cannot be undone, and sends nothing until confirmed", async () => {
    const user = userEvent.setup();
    openPanel(SESSION);
    await user.click(screen.getByRole("button", { name: "Reveal feedback" }));

    const confirm = screen.getByRole("group", { name: "Confirm" });
    expect(within(confirm).getByText(/cannot be undone/)).toBeInTheDocument();
    expect(sentTypes()).not.toContain("STUDY_REVEAL");
    await user.click(within(confirm).getByRole("button", { name: "Reveal feedback" }));
    expect(sentTypes()).toContain("STUDY_REVEAL");
  });

  it("sends nothing when Reveal is cancelled", async () => {
    const user = userEvent.setup();
    openPanel(SESSION);
    await user.click(screen.getByRole("button", { name: "Reveal feedback" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(sentTypes()).not.toContain("STUDY_REVEAL");
    expect(screen.getByRole("button", { name: "Reveal feedback" })).toBeInTheDocument();
  });

  it("asks once before End and then sends it", async () => {
    const user = userEvent.setup();
    openPanel({ ...SESSION, condition: "live" });
    await user.click(screen.getByRole("button", { name: "End block" }));

    expect(sentTypes()).not.toContain("STUDY_END_BLOCK");
    await user.click(
      within(screen.getByRole("group", { name: "Confirm" })).getByRole("button", {
        name: "End block"
      })
    );
    expect(sentTypes()).toContain("STUDY_END_BLOCK");
  });

  it("says Export and Exit are placeholders, and neither sends anything yet", async () => {
    const user = userEvent.setup();
    openPanel(SESSION);

    expect(screen.getByText(/Export and Exit are not connected yet/)).toBeInTheDocument();
    posted = [];
    await user.click(screen.getByRole("button", { name: "Export block" }));
    await user.click(screen.getByRole("button", { name: "Exit study mode" }));
    expect(screen.getByText(/This block has not ended/)).toBeInTheDocument();
    await user.click(
      within(screen.getByRole("group", { name: "Confirm" })).getByRole("button", {
        name: "Exit study mode"
      })
    );

    expect(sentTypes()).not.toContain("STUDY_EXIT");
    expect(posted).toEqual([]);
  });

  it("shows no block controls and no start form while waiting for the plugin", () => {
    render(<StudyHost>content</StudyHost>);
    chord();

    expect(screen.getByText(/Waiting for the plugin/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start block" })).not.toBeInTheDocument();
  });
});
