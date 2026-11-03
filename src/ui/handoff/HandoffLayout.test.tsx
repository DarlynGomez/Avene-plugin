import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emit, handoffData, showText } from "./fixtures";
import { HandoffTab } from "./HandoffTab";

let posted: { type: string; [key: string]: unknown }[];
beforeEach(() => {
  posted = [];
  vi.spyOn(window.parent, "postMessage").mockImplementation((message: unknown) => {
    posted.push((message as { pluginMessage: (typeof posted)[number] }).pluginMessage);
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const AT = "2026-10-28T10:00:00.000Z";
const URL = "https://www.figma.com/design/KEY/Checkout";

function mount(over: Record<string, unknown> = {}) {
  render(<HandoffTab />);
  act(() => emit({ ...handoffData(), ...over }));
}

describe("the steps", () => {
  it("reads top to bottom as numbered steps with plain titles", () => {
    mount();
    for (const title of ["Figma file link", "Who is it for?", "Handoff document"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    const badges = screen.getAllByText(/^[1-4]$/).map((el) => el.textContent);
    for (const step of ["1", "2", "3"]) expect(badges).toContain(step);
    expect(screen.queryByRole("heading", { name: "Drafts by an AI" })).toBeNull();
  });
});

describe("the file link", () => {
  it("shows no badge and no save button until there is something to save", () => {
    mount();
    expect(screen.queryByText("Linked")).toBeNull();
    expect(screen.queryByRole("button", { name: "Save link" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Link to this Figma file"), { target: { value: URL } });
    expect(screen.getByRole("button", { name: "Save link" })).toBeInTheDocument();
  });

  it("sends the address when saved, with the button or Enter", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Link to this Figma file"), { target: { value: URL } });
    fireEvent.click(screen.getByRole("button", { name: "Save link" }));
    expect(posted.at(-1)).toEqual({ type: "HANDOFF_FILE_URL_SET", url: URL });
  });

  it("shows Linked once an address is saved, and the button goes away", () => {
    mount({ fileUrl: URL });
    expect(screen.getByText("Linked")).toBeInTheDocument();
    expect(screen.getByLabelText("Link to this Figma file")).toHaveValue(URL);
    expect(screen.queryByRole("button", { name: "Save link" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Link to this Figma file"), {
      target: { value: `${URL}2` }
    });
    expect(screen.queryByText("Linked")).toBeNull();
  });
});

describe("who it is for", () => {
  it("is four cards, each with what that reader gets, and one chosen", () => {
    mount();
    const group = screen.getByRole("radiogroup", { name: "Who is it for?" });
    for (const [name, tag] of [
      ["Developers", "RAW HEX CODES"],
      ["Product managers", "TASK SCOPE"],
      ["Leadership", "SIGN-OFFS"],
      ["Client", "PLAIN ENGLISH"]
    ]) {
      expect(within(group).getByRole("radio", { name })).toBeInTheDocument();
      expect(within(group).getByText(tag)).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: "Developers" })).toBeChecked();
  });

  it("changes the labels the preview describes without an audience info box", () => {
    mount();
    expect(
      screen.queryByText(/Includes raw hex values, exact contrast ratios/)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/A clear report of what was checked and decided/)
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Cards for developers")).toHaveTextContent("Detected:");
    fireEvent.click(screen.getByRole("radio", { name: "Client" }));
    expect(screen.getByRole("radio", { name: "Client" })).toBeChecked();
    showText();
    expect(screen.getByLabelText("Document for client")).toHaveTextContent("Measured:");

    expect(screen.getByLabelText("Document for client")).not.toHaveTextContent("Detected:");
  });

  it("can be chosen with the keyboard like any radio group", () => {
    mount();
    const pm = screen.getByRole("radio", { name: "Product managers" });
    pm.focus();
    fireEvent.click(pm);
    expect(screen.getByLabelText("Cards for product managers")).toBeInTheDocument();
  });
});

describe("designer notes", () => {
  it("says there are none and what to do", () => {
    mount();
    expect(screen.getByRole("heading", { name: "Designer Statements (0)" })).toBeInTheDocument();
    expect(screen.getByText(/No notes yet/)).toBeInTheDocument();
  });

  it("lists each note with its layer, a kind chip, its words and the owner of a question", () => {
    mount({
      notes: {
        "1:1": [
          { category: "name", text: "Apply coupon code", updatedAt: AT },
          { category: "question", text: "Does focus return?", owner: "Dev", updatedAt: AT }
        ],
        "1:2": [{ category: "heading", text: "Payment", headingLevel: 2, updatedAt: AT }]
      },
      noteNames: { "1:1": "Coupon link", "1:2": "Page title" }
    });
    expect(screen.getByRole("heading", { name: "Designer Statements (3)" })).toBeInTheDocument();
    expect(screen.getByText("CONTROL NAME")).toBeInTheDocument();
    expect(screen.getByText("QUESTION")).toBeInTheDocument();
    expect(screen.getByText("HEADING LEVEL 2")).toBeInTheDocument();
    expect(screen.getByText("“Apply coupon code”")).toBeInTheDocument();
    expect(screen.getByText("Owner: Dev")).toBeInTheDocument();
    expect(screen.getAllByText("Coupon link")).toHaveLength(2);
  });

  it("says where notes print, in the words of the chosen reader", () => {
    mount();
    expect(screen.getByText("Prints under Decision")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Leadership" }));
    expect(screen.getByText("Prints under Decided")).toBeInTheDocument();
  });

  it("shows who to ask when the designer named someone", () => {
    mount({
      notes: {
        "1:1": [
          { category: "name", text: "Apply coupon code", contact: "Elena (Design)", updatedAt: AT }
        ]
      },
      noteNames: { "1:1": "Coupon link" }
    });
    expect(screen.getByText("Owner: Elena (Design)")).toBeInTheDocument();
  });
});

describe("the two main buttons", () => {
  it("sit side by side under the preview and open their sheets", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Add a note" }));
    expect(screen.getByRole("dialog", { name: "Add designer note to layer" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Review and copy" }));
    expect(screen.getByRole("dialog", { name: "Review and finalize handoff" })).toBeInTheDocument();
  });
});
