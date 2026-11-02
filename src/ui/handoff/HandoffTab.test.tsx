import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { copyText } from "../study/downloadFile";
import { emit, handoffData, HELPER_SIG, PRICE_SIG, showText } from "./fixtures";
import { HandoffTab } from "./HandoffTab";

vi.mock("../study/downloadFile", () => ({
  copyText: vi.fn().mockResolvedValue(true),
  saveTextFile: vi.fn()
}));

let posted: { type: string; [key: string]: unknown }[];
beforeEach(() => {
  vi.mocked(copyText).mockResolvedValue(true);
  posted = [];
  vi.spyOn(window.parent, "postMessage").mockImplementation((message: unknown) => {
    posted.push((message as { pluginMessage: (typeof posted)[number] }).pluginMessage);
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(copyText).mockClear();
});

function open() {
  render(<HandoffTab />);
  act(() => emit(handoffData()));
  showText();
  fireEvent.click(screen.getByRole("button", { name: "Review and copy" }));
  return screen.getByRole("dialog", { name: "Review and finalize handoff" });
}

describe("HandoffTab", () => {
  it("asks for the data on open and shows the document for the chosen reader", () => {
    render(<HandoffTab />);
    expect(posted[0]).toEqual({ type: "HANDOFF_DATA_REQUEST" });
    act(() => emit(handoffData()));
    showText();
    expect(screen.getByLabelText("Document for developers")).toHaveTextContent("Helper text");
    fireEvent.click(screen.getByLabelText("Client"));
    const client = screen.getByLabelText("Document for client");
    expect(client).toHaveTextContent(
      "Draft for the designer to send. Not a conformance statement."
    );
    expect(client).not.toHaveTextContent(/#[0-9A-F]{6}/);
  });

  it("shows a plain message when the sandbox refuses", () => {
    render(<HandoffTab />);
    act(() => emit({ type: "HANDOFF_REFUSED" }));
    expect(screen.getByText("Handoff is not available right now.")).toBeInTheDocument();
  });

  it("has three steps and no fourth, the drafts are part of the review", () => {
    render(<HandoffTab />);
    act(() => emit(handoffData()));
    expect(screen.queryByRole("heading", { name: "Drafts by an AI" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Draft this version" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Review and copy" }));
    expect(screen.getByRole("heading", { name: "Drafts by an AI" })).toBeInTheDocument();
  });
});

describe("review sheet", () => {
  it("is titled, and opens with the reviewer name empty and focused, and copy disabled", () => {
    const gate = open();
    expect(within(gate).getByText("REQUIRED TO COPY")).toBeInTheDocument();
    const name = within(gate).getByLabelText(/Reviewer full name/);
    expect(name).toHaveValue("");
    expect(name).toHaveFocus();
    expect(within(gate).getByRole("button", { name: "Finalize and copy" })).toBeDisabled();
  });

  it("keeps copy disabled for a blank name and copies the document with the reviewer once named", async () => {
    const gate = open();
    const name = within(gate).getByLabelText(/Reviewer full name/);
    fireEvent.change(name, { target: { value: "   " } });
    expect(within(gate).getByRole("button", { name: "Finalize and copy" })).toBeDisabled();
    expect(within(gate).queryByText(/Reviewer named/)).toBeNull();
    fireEvent.change(name, { target: { value: "Sam Lee" } });
    expect(
      within(gate).getByText("Reviewer named. You can now finalize and copy the notes.")
    ).toBeInTheDocument();
    const copy = within(gate).getByRole("button", { name: "Finalize and copy" });
    expect(copy).toBeEnabled();
    await act(async () => fireEvent.click(copy));
    const text = vi.mocked(copyText).mock.calls[0][0];
    expect(text).toContain("Reviewed by Sam Lee,");
    expect(text).toContain("Helper text");
    expect(within(gate).getByText("Copied. Paste it where it is going.")).toBeInTheDocument();
  });

  it("says what could not be copied instead of claiming success", async () => {
    vi.mocked(copyText).mockResolvedValueOnce(false);
    const gate = open();
    fireEvent.change(within(gate).getByLabelText(/Reviewer full name/), {
      target: { value: "Sam" }
    });
    await act(async () =>
      fireEvent.click(within(gate).getByRole("button", { name: "Finalize and copy" }))
    );
    expect(within(gate).getByText(/Copying did not work here/)).toBeInTheDocument();
  });

  it("lists the items needing action with how many are included, and a box takes one out", () => {
    const gate = open();
    expect(
      within(gate).getByRole("heading", { name: "Items needing action (2)" })
    ).toBeInTheDocument();
    expect(within(gate).getByText("2 included in document")).toBeInTheDocument();
    expect(within(gate).getAllByText(/2\.8:1 contrast \(1 layer\) on Payment/)).toHaveLength(2);
    fireEvent.click(within(gate).getByLabelText('Include "Helper text"'));
    expect(posted.at(-1)).toMatchObject({
      type: "HANDOFF_META_SET",
      signature: HELPER_SIG,
      meta: { leaveOut: true, signOff: "needs" }
    });
    expect((posted.at(-1) as unknown as { live: string[] }).live.sort()).toEqual(
      [HELPER_SIG, PRICE_SIG].sort()
    );
    act(() => emit(handoffData({ [HELPER_SIG]: { signOff: "needs", leaveOut: true } })));
    expect(within(gate).getByText("1 included in document")).toBeInTheDocument();
    expect(within(gate).getByLabelText('Include "Helper text"')).not.toBeChecked();
    expect(screen.getByLabelText("Document for developers")).not.toHaveTextContent("Helper text");
  });

  it("closes with Escape, the X or Back to edit, and puts focus back on the button that opened it", () => {
    render(<HandoffTab />);
    act(() => emit(handoffData()));
    const button = screen.getByRole("button", { name: "Review and copy" });
    button.focus();
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("button", { name: "Back to edit" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says the template is chosen until a draft is", () => {
    const gate = open();
    expect(within(gate).getByText("Template chosen by default")).toBeInTheDocument();
  });
});
