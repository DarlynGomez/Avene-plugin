import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { copyText } from "../study/downloadFile";
import { emit, handoffData, showText } from "./fixtures";
import { HandoffTab } from "./HandoffTab";

vi.mock("../study/downloadFile", () => ({
  copyText: vi.fn().mockResolvedValue(true),
  saveTextFile: vi.fn()
}));

let posted: { type: string; [key: string]: unknown }[];
beforeEach(() => {
  vi.mocked(copyText).mockResolvedValue(true);
  vi.mocked(copyText).mockClear();
  posted = [];
  vi.spyOn(window.parent, "postMessage").mockImplementation((message: unknown) => {
    posted.push((message as { pluginMessage: (typeof posted)[number] }).pluginMessage);
  });
  render(<HandoffTab />);
  act(() => emit(handoffData()));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const pick = (name: string) => fireEvent.click(screen.getByRole("radio", { name }));
const cards = (who = "developers") => screen.getByLabelText(`Cards for ${who}`);

describe("cards", () => {
  it("are the first view: a summary, numbered sections, a count on the action section", () => {
    expect(within(cards()).getByRole("heading", { name: "Summary" })).toBeInTheDocument();
    expect(
      within(cards()).getByRole("heading", { name: /^1\. Needs developer action/ })
    ).toHaveTextContent("2");
    expect(within(cards()).getByText("Helper text")).toBeInTheDocument();
    expect(within(cards()).getByText("Price label")).toBeInTheDocument();
    expect(within(cards()).getByText("Exact testable criteria")).toBeInTheDocument();
    expect(screen.queryByLabelText("Document for developers")).toBeNull();
  });

  it("show a stat in the summary and the highest severity as a warning line", () => {
    expect(within(cards()).getByText("2 dev fixes • 0 kept")).toBeInTheDocument();
    expect(within(cards()).getByText(/^Highest severity open: /)).toBeInTheDocument();
  });

  it("show each layer with its measured line in code style and a suggested fix in its own box", () => {
    expect(
      within(cards()).getAllByText(/^Detected: 2\.8:1 contrast \(#[0-9A-F]{6} on #FFFFFF\)$/)
    ).toHaveLength(2);
    const fixes = within(cards()).getAllByText("Suggested fix:");
    expect(fixes).toHaveLength(2);
    expect(fixes[0].parentElement).toHaveTextContent(
      /Use #[0-9A-F]{6} on the same hue to reach \d[\d.]*:1 \(needs 4\.5:1\)\./
    );
    expect(fixes[0].parentElement?.querySelector("code")).not.toBeNull();
    expect(
      within(cards()).getAllByText(/^On Payment\. Needs 4\.5:1 \(WCAG 1\.4\.3\)\./)
    ).toHaveLength(2);
  });

  it("have a Figma button that selects the layers in the file", () => {
    fireEvent.click(screen.getByRole("button", { name: "Show Helper text in Figma" }));
    expect(posted.at(-1)).toEqual({ type: "SHOW_ON_CANVAS", nodeIds: ["1:1"] });
  });

  it("end with what the check does not cover, and show no color codes for a client", () => {
    expect(within(cards()).getByText("What this check does not cover:")).toBeInTheDocument();
    expect(cards()).toHaveTextContent("keyboard behavior, screen reader output, code order");
    pick("Client");
    expect(cards("client")).not.toHaveTextContent(/#[0-9A-F]{6}/);
    expect(cards("client")).toHaveTextContent(
      "Draft for the designer to send. Not a conformance statement."
    );
  });
});

describe("open questions", () => {
  it("is always there, with a button to add one, even when there are none", () => {
    const section = within(cards()).getByRole("region", { name: "Open questions" });
    expect(within(section).getByRole("heading", { name: /Open questions/ })).toHaveTextContent("0");
    expect(within(section).getByText("No open questions yet.")).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "Add question" })).toBeInTheDocument();
  });

  it("lists a question with who should answer it", () => {
    act(() =>
      emit({
        ...handoffData(),
        notes: {
          "1:1": [
            { category: "question", text: "Does focus return?", owner: "Dev", updatedAt: "t" }
          ]
        },
        noteNames: { "1:1": "Helper text" }
      })
    );
    const section = within(cards()).getByRole("region", { name: "Open questions" });
    expect(within(section).getByText("• Does focus return?")).toBeInTheDocument();
    expect(within(section).getByText("Dev")).toBeInTheDocument();
  });

  it("opens the note sheet on a question and saves it for the chosen layer", () => {
    fireEvent.click(screen.getByRole("button", { name: "Add question" }));
    const sheet = screen.getByRole("dialog", { name: "Add designer note to layer" });
    expect(within(sheet).getByLabelText("Note category")).toHaveValue("question");
    expect(within(sheet).getByLabelText("Who should answer?")).toBeInTheDocument();
    fireEvent.change(within(sheet).getByLabelText("Statement / instructions"), {
      target: { value: "Does focus return?" }
    });
    fireEvent.change(within(sheet).getByLabelText("Who should answer?"), {
      target: { value: "PM" }
    });
    fireEvent.click(within(sheet).getByRole("button", { name: "Save note" }));
    expect(posted.at(-1)).toMatchObject({
      type: "HANDOFF_NOTES_SET",
      nodeId: "1:1",
      notes: [{ category: "question", text: "Does focus return?", owner: "PM" }]
    });
  });
});

describe("the text view", () => {
  it("is the exact text, and the toggle goes back and forth", () => {
    expect(screen.getByRole("button", { name: "Cards" })).toHaveAttribute("aria-pressed", "true");
    showText();
    expect(screen.getByRole("button", { name: "Text" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Document for developers")).toHaveTextContent(
      'Detected: "Helper text" on Payment'
    );
    fireEvent.click(screen.getByRole("button", { name: "Cards" }));
    expect(cards()).toBeInTheDocument();
  });
});

describe("formats", () => {
  it("are the same three for every reader", () => {
    for (const who of ["Developers", "Product managers", "Leadership", "Client"]) {
      pick(who);
      const tabs = screen.getByRole("tablist", { name: "Kind of document" });
      expect(
        within(tabs)
          .getAllByRole("tab")
          .map((t) => t.textContent)
      ).toEqual(["1-Page Spec", "Jira/Linear", "PM 3-Line"]);
    }
  });

  it("show the ticket as a checklist for developers, with the suggested color", () => {
    fireEvent.click(screen.getByRole("tab", { name: "Jira/Linear" }));
    const ticket = screen.getByLabelText("Tickets");
    expect(ticket).toHaveTextContent("[A11y] Payment: text contrast, 2 layers");
    expect(ticket).toHaveTextContent(/reaches at least 4\.5:1 against #FFFFFF/);
    expect(ticket).toHaveTextContent("A color on the same hue that would reach it");
    showText();
    expect(screen.getByLabelText("Document for developers")).toHaveTextContent(
      "Acceptance criteria"
    );
  });

  it("leave color codes out of the ticket for anyone else", () => {
    pick("Product managers");
    fireEvent.click(screen.getByRole("tab", { name: "Jira/Linear" }));
    const ticket = screen.getByLabelText("Tickets");
    expect(ticket).toHaveTextContent("against its background");
    expect(ticket).not.toHaveTextContent(/#[0-9A-F]{6}/);
  });

  it("show the three-line brief numbered and headed, in plain words and with no colors", () => {
    pick("Product managers");
    fireEvent.click(screen.getByRole("tab", { name: "PM 3-Line" }));
    const brief = screen.getByLabelText("Three-line brief");
    expect(brief).toHaveTextContent("1. Scope");
    expect(brief).toHaveTextContent("2. Decision needed");
    expect(brief).toHaveTextContent("3. Not yet verified");
    expect(brief).not.toHaveTextContent(/#[0-9A-F]{6}/);
  });

  it("show the format name in the footer", () => {
    expect(screen.getByText("1-Page Spec", { selector: "strong" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "PM 3-Line" }));
    expect(screen.getByText("PM 3-Line", { selector: "strong" })).toBeInTheDocument();
  });
});

describe("quick copy raw", () => {
  it("is one click with no name, copies template text and says on its last line that nobody has reviewed it", async () => {
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Quick copy raw" })));
    const text = vi.mocked(copyText).mock.calls[0][0];
    expect(text).toContain("Helper text");
    expect(text).not.toContain("Reviewed by");
    expect(text.split("\n").at(-1)).toBe("Not yet reviewed by a person.");
    expect(screen.getByText("Copied. It says it has not been reviewed.")).toBeInTheDocument();
  });

  it("copies the ticket or the brief when that is the format shown", async () => {
    fireEvent.click(screen.getByRole("tab", { name: "Jira/Linear" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Quick copy raw" })));
    const ticket = vi.mocked(copyText).mock.calls[0][0];
    expect(ticket).toContain("Title: [A11y] Payment");
    expect(ticket.split("\n").at(-1)).toBe("Not yet reviewed by a person.");
    fireEvent.click(screen.getByRole("tab", { name: "PM 3-Line" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Quick copy raw" })));
    expect(vi.mocked(copyText).mock.calls[1][0].split("\n")).toHaveLength(4);
  });

  it("says when copying did not work instead of claiming it did", async () => {
    vi.mocked(copyText).mockResolvedValueOnce(false);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Quick copy raw" })));
    expect(screen.getByText(/Copying did not work here/)).toBeInTheDocument();
  });
});
