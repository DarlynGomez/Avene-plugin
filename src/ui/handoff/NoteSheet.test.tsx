import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NoteSheet } from "./NoteSheet";

afterEach(cleanup);

const LAYERS = [
  { nodeId: "1:1", name: "Hero image" },
  { nodeId: "1:2", name: "Title" }
];

function setup(notes = {}, audience: "developer" | "client" = "developer") {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <NoteSheet
      layers={LAYERS}
      notesByNode={notes}
      audience={audience}
      onSave={onSave}
      onClose={onClose}
    />
  );
  return { onSave, onClose };
}

describe("NoteSheet", () => {
  it("is titled and says where the note prints, in the reader's words", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Add designer note to layer" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Prints as a formal statement under the Detected label.".replace("Detected", "Decision")
      )
    ).toBeInTheDocument();
    cleanup();
    setup({}, "client");
    expect(
      screen.getByText("Prints as a formal statement under the Decided label.")
    ).toBeInTheDocument();
  });

  it("opens on a field, not the close button, and keeps save disabled until there is text", () => {
    setup();
    expect(screen.getByLabelText("Layer target name")).toHaveFocus();
    const save = screen.getByRole("button", { name: "Save note" });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Statement / instructions"), {
      target: { value: "A cafe sign" }
    });
    expect(save).toBeEnabled();
  });

  it("has the placeholders of the design", () => {
    setup();
    expect(
      screen.getByPlaceholderText("Write clear instructions for developers or product team...")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("e.g. Elena (Design) or Jordan (Front-end)")
    ).toBeInTheDocument();
  });

  it("saves a note for the chosen layer, with who to ask, and closes", () => {
    const { onSave, onClose } = setup();
    fireEvent.change(screen.getByLabelText("Layer target name"), { target: { value: "1:2" } });
    fireEvent.change(screen.getByLabelText("Note category"), { target: { value: "heading" } });
    fireEvent.change(screen.getByLabelText("Heading level"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Statement / instructions"), {
      target: { value: "Active orders" }
    });
    fireEvent.change(screen.getByLabelText("Owner / contact"), {
      target: { value: "Elena (Design)" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(onSave).toHaveBeenCalledWith("1:2", [
      expect.objectContaining({
        category: "heading",
        text: "Active orders",
        headingLevel: 2,
        contact: "Elena (Design)"
      })
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it("lets a decoration image be saved with no text", () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByLabelText(/This image is decoration/));
    expect(screen.getByLabelText("Statement / instructions")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(onSave).toHaveBeenCalledWith("1:1", [
      expect.objectContaining({ category: "alt", decorative: true })
    ]);
  });

  it("asks who should answer a question and can remove an earlier note", () => {
    const existing = {
      "1:1": [{ category: "question", text: "Old", owner: "PM", updatedAt: "t" }]
    };
    const { onSave } = setup(existing);
    fireEvent.change(screen.getByLabelText("Note category"), { target: { value: "question" } });
    expect(screen.getByLabelText("Who should answer?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove this note" }));
    expect(onSave).toHaveBeenCalledWith("1:1", []);
  });

  it("closes with Escape, the X, and Cancel", () => {
    const { onClose } = setup();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
