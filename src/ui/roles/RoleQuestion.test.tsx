import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RoleStateView } from "../../shared/roles/roleMessages";
import { RoleQuestion } from "./RoleQuestion";

afterEach(cleanup);

const view = (patch: Partial<RoleStateView>): RoleStateView => ({
  nodeId: "1:1",
  allowed: true,
  rule: null,
  suggestion: null,
  answer: null,
  request: null,
  ...patch
});
const rule = {
  role: "caption" as const,
  ruleId: "N3",
  reason: 'Its layer name says it is a note: "subtitle".'
};

describe("the three states", () => {
  it("a rule decided: says why, has no AI label, and offers That is right and Change", () => {
    render(<RoleQuestion view={view({ rule })} onAnswer={vi.fn()} />);
    expect(screen.getByText(/Treated as/)).toHaveTextContent(
      'Treated as caption. Its layer name says it is a note: "subtitle".'
    );
    expect(screen.queryByText("AI suggestion")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "That is right" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
  });

  it("a model suggested it: labelled AI suggestion, asked as a question, never stated as a fact", () => {
    render(
      <RoleQuestion
        view={view({ suggestion: { label: "button text", model: "m", live: true } })}
        onAnswer={vi.fn()}
      />
    );
    expect(screen.getByText("AI suggestion")).toBeInTheDocument();
    expect(screen.getByText(/Is this text a/)).toHaveTextContent("Is this text a button text?");
    expect(screen.getByText(/It can be wrong/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument();
    expect(screen.queryByText(/Treated as/)).not.toBeInTheDocument();
  });

  it("nothing decided: asks, and offers only Choose", () => {
    render(<RoleQuestion view={view({})} onAnswer={vi.fn()} />);
    expect(screen.getByText("What kind of text is this?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Yes" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose" })).toBeInTheDocument();
  });

  it("answered: says what was answered and offers Change, with no Yes", () => {
    render(
      <RoleQuestion
        view={view({ rule, answer: { role: "unsure", response: "unsure" } })}
        onAnswer={vi.fn()}
      />
    );
    expect(screen.getByText(/You said/)).toHaveTextContent("You said not sure.");
    expect(screen.queryByRole("button", { name: "That is right" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
  });
});

describe("confirming and changing", () => {
  it("confirming a rule or a suggestion answers with what was shown", async () => {
    const onAnswer = vi.fn();
    render(<RoleQuestion view={view({ rule })} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByRole("button", { name: "That is right" }));
    expect(onAnswer).toHaveBeenCalledWith("caption", "confirmed");
    cleanup();
    const again = vi.fn();
    render(
      <RoleQuestion
        view={view({ suggestion: { label: "label", model: null, live: false } })}
        onAnswer={again}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(again).toHaveBeenCalledWith("label", "confirmed");
  });

  it("Change opens six labels and Not sure with their meanings, in a radio group", async () => {
    render(<RoleQuestion view={view({ rule })} onAnswer={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Change" }));
    const group = screen.getByRole("radiogroup");
    const names = within(group)
      .getAllByRole("radio")
      .map((r) => r.getAttribute("value"));
    expect(names).toEqual([
      "heading",
      "body",
      "caption",
      "label",
      "button text",
      "decorative",
      "unsure"
    ]);
    expect(within(group).getByText("Not sure")).toBeInTheDocument();
    expect(
      within(group).getByText("A title that introduces a section or a screen")
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /caption/ })).toBeChecked();
  });

  it("the arrow keys move between the choices, and Save answers", async () => {
    const onAnswer = vi.fn();
    render(<RoleQuestion view={view({ rule })} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByRole("button", { name: "Change" }));
    screen.getByRole("radio", { name: /caption/ }).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: /^label/ })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onAnswer).toHaveBeenCalledWith("label", "changed");
  });

  it("choosing what was shown is a confirmation, and Not sure is unsure", async () => {
    const onAnswer = vi.fn();
    render(<RoleQuestion view={view({ rule })} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByRole("button", { name: "Change" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onAnswer).toHaveBeenLastCalledWith("caption", "confirmed");
    await userEvent.click(screen.getByRole("button", { name: "Change" }));
    await userEvent.click(screen.getByRole("radio", { name: /Not sure/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onAnswer).toHaveBeenLastCalledWith("unsure", "unsure");
  });

  it("Cancel closes the choices without answering", async () => {
    const onAnswer = vi.fn();
    render(<RoleQuestion view={view({})} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByRole("button", { name: "Choose" }));
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
