import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NoteSheet } from "./NoteSheet";

afterEach(cleanup);

const LAYERS = [
  { nodeId: "1:1", name: "Hero image" },
  { nodeId: "1:2", name: "Title" }
];

function setup(notes = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<NoteSheet layers={LAYERS} notesByNode={notes} onSave={onSave} onClose={onClose} />);
  return { onSave, onClose };
}

describe("NoteSheet", () => {
  it("opens focused on the first field and keeps save disabled until there is text", () => {
    setup();
    expect(screen.getByLabelText("Layer")).toHaveFocus();
    const save = screen.getByRole("button", { name: "Save note" });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Your note"), { target: { value: "A cafe sign" } });
    expect(save).toBeEnabled();
  });

  it("saves a note for the chosen layer and closes", () => {
    const { onSave, onClose } = setup();
    fireEvent.change(screen.getByLabelText("Layer"), { target: { value: "1:2" } });
    fireEvent.change(screen.getByLabelText("What is it about?"), { target: { value: "heading" } });
    fireEvent.change(screen.getByLabelText("Heading level"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Your note"), { target: { value: "Active orders" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(onSave).toHaveBeenCalledWith("1:2", [
      expect.objectContaining({ category: "heading", text: "Active orders", headingLevel: 2 })
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it("lets a decoration image be saved with no text", () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByLabelText(/This image is decoration/));
    expect(screen.getByLabelText("Your note")).toBeDisabled();
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
    fireEvent.change(screen.getByLabelText("What is it about?"), { target: { value: "question" } });
    expect(screen.getByLabelText("Who should answer?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove this note" }));
    expect(onSave).toHaveBeenCalledWith("1:1", []);
  });

  it("closes with Escape", () => {
    const { onClose } = setup();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
