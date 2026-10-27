import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { copyText } from "../study/downloadFile";
import { emit, handoffData, HELPER_SIG, PRICE_SIG } from "./fixtures";
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
  fireEvent.click(screen.getByRole("button", { name: "Review and copy" }));
  return screen.getByRole("dialog");
}

describe("HandoffTab", () => {
  it("asks for the data on open and shows the document for the chosen reader", () => {
    render(<HandoffTab />);
    expect(posted[0]).toEqual({ type: "HANDOFF_DATA_REQUEST" });
    act(() => emit(handoffData()));
    expect(screen.getByLabelText("Document for developers")).toHaveTextContent("Helper text");
    fireEvent.click(screen.getByLabelText("A client"));
    const client = screen.getByLabelText("Document for a client");
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
});

describe("review gate", () => {
  it("opens with the name empty and focused, and copy disabled", () => {
    const gate = open();
    const name = within(gate).getByLabelText("Reviewed by");
    expect(name).toHaveValue("");
    expect(name).toHaveFocus();
    expect(within(gate).getByRole("button", { name: "Copy" })).toBeDisabled();
  });

  it("keeps copy disabled for a blank name and copies the document with the reviewer once named", async () => {
    const gate = open();
    const name = within(gate).getByLabelText("Reviewed by");
    fireEvent.change(name, { target: { value: "   " } });
    expect(within(gate).getByRole("button", { name: "Copy" })).toBeDisabled();
    fireEvent.change(name, { target: { value: "Sam Lee" } });
    const copy = within(gate).getByRole("button", { name: "Copy" });
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
    fireEvent.change(within(gate).getByLabelText("Reviewed by"), { target: { value: "Sam" } });
    await act(async () => fireEvent.click(within(gate).getByRole("button", { name: "Copy" })));
    expect(within(gate).getByText(/Copying did not work here/)).toBeInTheDocument();
  });

  it("counts the items listed and a leave-out changes the count and the document", () => {
    const gate = open();
    expect(
      within(gate).getByText("2 items will be listed as needing developer action")
    ).toBeInTheDocument();
    fireEvent.click(within(gate).getByLabelText('Leave "Helper text" out of this document'));
    expect(posted.at(-1)).toMatchObject({
      type: "HANDOFF_META_SET",
      signature: HELPER_SIG,
      meta: { leaveOut: true, signOff: "needs" }
    });
    expect((posted.at(-1) as unknown as { live: string[] }).live.sort()).toEqual(
      [HELPER_SIG, PRICE_SIG].sort()
    );
    act(() => emit(handoffData({ [HELPER_SIG]: { signOff: "needs", leaveOut: true } })));
    expect(
      within(gate).getByText("1 item will be listed as needing developer action")
    ).toBeInTheDocument();
    expect(within(gate).getByLabelText('Leave "Helper text" out of this document')).toBeChecked();
    expect(screen.getByLabelText("Document for developers")).not.toHaveTextContent("Helper text");
  });

  it("closes with Escape or Close and puts focus back on the button that opened it", () => {
    const opener = screen.queryByRole("button", { name: "Review and copy" });
    expect(opener).toBeNull();
    open();
    const button = screen.getByRole("button", { name: "Review and copy" });
    button.focus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button).toHaveFocus();
  });

  it("says no text was written by an AI, because this version is template only", () => {
    const gate = open();
    expect(within(gate).getByText(/Text written by an AI: none/)).toBeInTheDocument();
  });
});
