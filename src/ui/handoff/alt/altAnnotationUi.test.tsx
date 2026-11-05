import { act, cleanup, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AnnotationStatus } from "../../../shared/handoff/alt/annotationStatus";
import type { NodeNote } from "../../../shared/handoff/noteStorage";
import { capturePosts, emit, mountPanel } from "./altHarness";

vi.mock("../../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../../shared/handoffFlags")>()),
  FEATURE_ALT_ANNOTATIONS: true
}));

const AT = "2026-11-05T10:00:00.000Z";
const note = (over: Partial<NodeNote> = {}): NodeNote => ({
  category: "alt",
  text: "A hero banner",
  updatedAt: AT,
  ...over
});

let posted: ReturnType<typeof capturePosts>;
beforeEach(() => {
  posted = capturePosts();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const annotationPosts = () => posted.filter((m) => m.type.startsWith("HANDOFF_ANNOTAT"));

async function openSheet(status: AnnotationStatus = "none", noteOver: Partial<NodeNote> = {}) {
  const user = userEvent.setup();
  await mountPanel({ notes: { "9:1": [note(noteOver)] } });
  await act(async () => {
    emit({ type: "HANDOFF_ANNOTATION_STATUSES", statuses: { "9:1": status } });
  });
  await user.selectOptions(screen.getByRole("combobox", { name: "Check" }), "alt");
  await user.click(screen.getAllByRole("button", { name: "Edit note" })[0]);
  return { user, dialog: screen.getByRole("dialog") };
}

describe("the annotation control", () => {
  it("asks for the statuses of the layers that have notes, as a read", async () => {
    await mountPanel({ notes: { "9:1": [note()] } });
    expect(annotationPosts()).toEqual([
      { type: "HANDOFF_ANNOTATION_STATUS_REQUEST", nodeIds: ["9:1"] }
    ]);
  });

  it("shows the status as plain text and the one helper line, with Add as annotation", async () => {
    const { dialog } = await openSheet("none");
    expect(within(dialog).getByText("Annotation: Not added")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Adds a note on this layer that everyone with the file can see, including in Dev Mode. Avene never adds it by itself."
      )
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Add as annotation" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Remove annotation" })).toBeNull();
  });

  it.each([
    ["in-sync", "Annotation: Added", ["Remove annotation"]],
    ["out-of-date", "Annotation: Out of date", ["Update annotation", "Remove annotation"]],
    ["missing", "Annotation: Missing from the file", ["Add as annotation"]]
  ] as const)("for %s says %s and offers the matching buttons", async (status, text, buttons) => {
    const { dialog } = await openSheet(status);
    expect(within(dialog).getByText(text)).toBeInTheDocument();
    expect(
      within(dialog)
        .getAllByRole("button", { name: /annotation/i })
        .map((b) => b.textContent)
    ).toEqual([...buttons]);
  });

  it("says why a layer is not supported and offers no button", async () => {
    const { dialog } = await openSheet("unsupported");
    expect(within(dialog).getByText("Annotation: Not supported on this layer")).toBeInTheDocument();
    expect(
      within(dialog).getByText("This kind of layer cannot hold annotations.")
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /annotation/i })).toBeNull();
  });

  it("adds a line about the model only for a note a model drafted", async () => {
    const { dialog } = await openSheet("none", { source: "ai" });
    expect(
      within(dialog).getByText(
        "This text was drafted by a model. The annotation will contain the text only."
      )
    ).toBeInTheDocument();
    cleanup();
    const again = await openSheet("none");
    expect(within(again.dialog).queryByText(/drafted by a model/)).toBeNull();
  });

  it("acts on this one layer only, with one message per press", async () => {
    const { user, dialog } = await openSheet("none");
    posted.length = 0;
    await user.click(within(dialog).getByRole("button", { name: "Add as annotation" }));
    expect(posted).toEqual([{ type: "HANDOFF_ANNOTATE", nodeId: "9:1" }]);
  });

  it("keeps focus on the button after the action, whatever it turns into", async () => {
    const { user, dialog } = await openSheet("none");
    const button = within(dialog).getByRole("button", { name: "Add as annotation" });
    await user.click(button);
    await act(async () => {
      emit({
        type: "HANDOFF_ANNOTATION_RESULT",
        action: "annotate",
        nodeId: "9:1",
        ok: true,
        status: "in-sync"
      });
      emit({ type: "HANDOFF_ANNOTATION_STATUSES", statuses: { "9:1": "in-sync" } });
    });
    expect(button).toHaveTextContent("Remove annotation");
    expect(button).toHaveFocus();
  });

  it("shows one plain line when it did not work", async () => {
    const { user, dialog } = await openSheet("out-of-date");
    await user.click(within(dialog).getByRole("button", { name: "Update annotation" }));
    await act(async () => {
      emit({
        type: "HANDOFF_ANNOTATION_RESULT",
        action: "update",
        nodeId: "9:1",
        ok: false,
        reason: "changed-on-canvas"
      });
    });
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "That annotation was changed on the canvas, so Avene is leaving it alone. Edit or delete it there."
    );
  });

  it("waits for the note to be saved when the text was changed", async () => {
    const { user, dialog } = await openSheet("in-sync");
    await user.click(within(dialog).getByLabelText("Description"));
    await user.paste(" more");
    posted.length = 0;
    await user.click(within(dialog).getByRole("button", { name: "Remove annotation" }));
    expect(within(dialog).getByText(/Save the note first/)).toBeInTheDocument();
    expect(posted).toEqual([]);
  });

  it("does not annotate when the note is saved for all the layers", async () => {
    const user = userEvent.setup();
    await mountPanel({ notes: { "9:2": [note({ text: "A photo" })] } });
    await user.selectOptions(screen.getByRole("combobox", { name: "Check" }), "alt");
    await user.click(screen.getAllByRole("button", { name: "Add note" })[1]);
    posted.length = 0;
    await user.click(screen.getByLabelText(/Apply this note to all 2 layers/));
    await user.click(screen.getByLabelText("Description"));
    await user.paste("A profile photo");
    await user.click(screen.getByRole("button", { name: "Save alt text" }));
    expect(posted.map((m) => m.type)).toEqual(["HANDOFF_ALT_SET", "HANDOFF_ALT_SET"]);
  });

  it("is not there for a layer with no saved note yet", async () => {
    const user = userEvent.setup();
    await mountPanel();
    await user.selectOptions(screen.getByRole("combobox", { name: "Check" }), "alt");
    await user.click(screen.getAllByRole("button", { name: "Add note" })[0]);
    expect(screen.queryByText(/^Annotation:/)).toBeNull();
  });
});

describe("the Annotated chip", () => {
  it("shows on the card only when the annotation is in sync", async () => {
    const user = userEvent.setup();
    await mountPanel({ notes: { "9:1": [note()] } });
    await act(async () => {
      emit({ type: "HANDOFF_ANNOTATION_STATUSES", statuses: { "9:1": "in-sync" } });
    });
    await user.selectOptions(screen.getByRole("combobox", { name: "Check" }), "alt");
    expect(screen.getByText("Annotated")).toBeInTheDocument();
    await act(async () => {
      emit({ type: "HANDOFF_ANNOTATION_STATUSES", statuses: { "9:1": "out-of-date" } });
    });
    expect(screen.queryByText("Annotated")).toBeNull();
  });
});

describe("in a study session", () => {
  it("has no annotation control, no sheet and sends no annotation message", async () => {
    await mountPanel({ study: true, notes: { "9:1": [note()] } });
    expect(screen.queryByRole("combobox", { name: "Check" })).toBeNull();
    expect(screen.queryByText(/^Annotation:/)).toBeNull();
    expect(annotationPosts()).toEqual([]);
  });
});
