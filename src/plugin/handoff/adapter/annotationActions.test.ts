import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { annotationTextOf, labelHash } from "../../../shared/handoff/alt/annotationText";
import { parseNodeNotes } from "../../../shared/handoff/noteStorage";
import type { FakeNode } from "../../markers/adapter/markerFigmaStub";
import { KEY_NODE_NOTES } from "../handoffKeys";
import { annotateNode, removeAnnotation, updateAnnotation } from "./annotationActions";
import { annotationStatuses } from "./annotationStatuses";
import { altNote, giveNote, installFake, labelsOf } from "./annotationHarness";
import { setAltNote } from "./notesStore";

const DESIGNER: Annotation = { label: "Keep the corners square", categoryId: "designer-cat" };

let fake: ReturnType<typeof installFake>;
let node: FakeNode;
const storedAlt = () =>
  parseNodeNotes(node.getPluginData(KEY_NODE_NOTES)).find((n) => n.category === "alt");
const altCategory = () => fake.categories.find((c) => c.label === "Alt text");
const must = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error("expected a value");
  return value;
};

beforeEach(() => {
  fake = installFake();
  node = fake.addNode("1:1", [DESIGNER]);
  giveNote(node, altNote("A cafe sign"));
});
afterEach(() => vi.unstubAllGlobals());

describe("adding the annotation", () => {
  it("appends one annotation in the Alt text category and keeps every other one as it was", async () => {
    const before = node.annotations;
    const result = await annotateNode("1:1");
    expect(result).toMatchObject({ ok: true, status: "in-sync", action: "annotate" });
    expect(node.annotations).toHaveLength(2);
    expect(node.annotations[0]).toBe(before[0]);
    expect(node.annotations[1]).toEqual({ label: "A cafe sign", categoryId: altCategory()?.id });
  });

  it("is one undo step and records what it wrote on the note", async () => {
    await annotateNode("1:1");
    expect(fake.commitUndo).toHaveBeenCalledTimes(1);
    expect(storedAlt()).toMatchObject({ annotated: true, annotatedHash: labelHash("A cafe sign") });
  });

  it("makes the category once, never touches the CADT category, and remakes one the designer deleted", async () => {
    const cadt = fake.addCategory("CADT");
    await annotateNode("1:1");
    expect(fake.categories.filter((c) => c.label === "Alt text")).toHaveLength(1);
    expect(cadt.label).toBe("CADT");
    expect(node.annotations.some((a) => a.categoryId === cadt.id)).toBe(false);
    fake.categories.splice(fake.categories.indexOf(must(altCategory())), 1);
    await removeAnnotation("1:1");
    await annotateNode("1:1");
    expect(altCategory()).toBeDefined();
    expect(fake.categories.filter((c) => c.label === "Alt text")).toHaveLength(1);
  });

  it("writes the fixed text for a decorative note", async () => {
    giveNote(node, { category: "alt", text: "", decorative: true, updatedAt: "t" });
    await annotateNode("1:1");
    expect(labelsOf(node).at(-1)).toBe(
      annotationTextOf({ category: "alt", text: "", decorative: true, updatedAt: "t" })
    );
  });

  it("does not add a second one for the same note, and writes nothing the second time", async () => {
    await annotateNode("1:1");
    fake.calls.length = 0;
    const again = await annotateNode("1:1");
    expect(again).toMatchObject({ ok: false, reason: "already-annotated" });
    expect(fake.calls.filter((c) => c.startsWith("annotations"))).toEqual([]);
    expect(fake.commitUndo).toHaveBeenCalledTimes(1);
  });
});

describe("updating and removing", () => {
  beforeEach(async () => {
    await annotateNode("1:1");
    fake.commitUndo.mockClear();
  });

  it("update replaces ours in place with the new text, keeps the rest and is one undo step", async () => {
    const designer = node.annotations[0];
    giveNote(node, { ...must(storedAlt()), text: "A bigger cafe sign" });
    expect((await updateAnnotation("1:1")).ok).toBe(true);
    expect(labelsOf(node)).toEqual(["Keep the corners square", "A bigger cafe sign"]);
    expect(node.annotations[0]).toBe(designer);
    expect(fake.commitUndo).toHaveBeenCalledTimes(1);
    expect(storedAlt()?.annotatedHash).toBe(labelHash("A bigger cafe sign"));
  });

  it("remove takes off only ours and forgets it", async () => {
    const result = await removeAnnotation("1:1");
    expect(result).toMatchObject({ ok: true, status: "none" });
    expect(labelsOf(node)).toEqual(["Keep the corners square"]);
    expect(storedAlt()?.annotated).toBeUndefined();
    expect(fake.commitUndo).toHaveBeenCalledTimes(1);
  });

  it("leaves a designer's annotation with the same words alone, in no category or another one", async () => {
    const twin: Annotation = { label: "A cafe sign" };
    const other: Annotation = { label: "A cafe sign", categoryId: "designer-cat" };
    node.annotations = [twin, other, ...node.annotations];
    await removeAnnotation("1:1");
    expect(node.annotations).toEqual([twin, other, DESIGNER]);
  });

  it("does not touch an annotation that was edited on the canvas, for update or remove", async () => {
    const ours = node.annotations[1];
    node.annotations = [node.annotations[0], { ...ours, label: "Edited by hand" }];
    fake.calls.length = 0;
    expect(await updateAnnotation("1:1")).toMatchObject({ ok: false, reason: "changed-on-canvas" });
    expect(await removeAnnotation("1:1")).toMatchObject({ ok: false, reason: "changed-on-canvas" });
    expect(labelsOf(node)).toEqual(["Keep the corners square", "Edited by hand"]);
    expect(fake.calls.filter((c) => c.startsWith("annotations"))).toEqual([]);
  });

  it("remove on one that is already gone only forgets the record, with no canvas write", async () => {
    node.annotations = [DESIGNER];
    fake.calls.length = 0;
    expect(await removeAnnotation("1:1")).toMatchObject({ ok: true, status: "none" });
    expect(storedAlt()?.annotated).toBeUndefined();
    expect(fake.calls.filter((c) => c.startsWith("annotations"))).toEqual([]);
  });

  it("a note with an annotation cannot be cleared until the annotation is removed", async () => {
    const refused = await setAltNote("1:1", { text: "", decorative: false, source: "designer" });
    expect(refused.saved).toBe(false);
    expect(storedAlt()?.text).toBe("A cafe sign");
    await removeAnnotation("1:1");
    expect(
      (await setAltNote("1:1", { text: "", decorative: false, source: "designer" })).saved
    ).toBe(true);
  });

  it("keeps the annotation record when the text is edited, so the status can say out of date", async () => {
    await setAltNote("1:1", { text: "A new text", decorative: false, source: "designer" });
    expect(storedAlt()).toMatchObject({
      text: "A new text",
      annotated: true,
      annotatedHash: labelHash("A cafe sign")
    });
    expect((await annotationStatuses(["1:1"]))["1:1"]).toBe("out-of-date");
  });
});

describe("status", () => {
  it("is none, in-sync, out-of-date, missing and unsupported as things change", async () => {
    expect((await annotationStatuses(["1:1"]))["1:1"]).toBe("none");
    await annotateNode("1:1");
    expect((await annotationStatuses(["1:1"]))["1:1"]).toBe("in-sync");
    node.annotations = [node.annotations[0], { ...node.annotations[1], label: "Edited" }];
    expect((await annotationStatuses(["1:1"]))["1:1"]).toBe("out-of-date");
    node.annotations = [DESIGNER];
    expect((await annotationStatuses(["1:1"]))["1:1"]).toBe("missing");
    const group = fake.addNode("g", []);
    delete (group as unknown as Record<string, unknown>).annotations;
    giveNote(group, altNote("A group"));
    expect((await annotationStatuses(["g"]))["g"]).toBe("unsupported");
  });

  it("is a read: it writes nothing, makes no category and skips a layer that is gone", async () => {
    fake.calls.length = 0;
    const out = await annotationStatuses(["1:1", "nope"]);
    expect(out).toEqual({ "1:1": "none" });
    expect(fake.calls).toEqual([]);
    expect(altCategory()).toBeUndefined();
  });
});

describe("what it refuses, and never throws", () => {
  it("answers an id Figma cannot read, such as one with dashes, as a layer that is gone", async () => {
    vi.spyOn(figma, "getNodeByIdAsync").mockRejectedValue(new Error("Invalid node id"));
    expect(await annotateNode("1-1")).toMatchObject({ ok: false, reason: "layer-gone" });
    expect(await updateAnnotation("1-1")).toMatchObject({ ok: false, reason: "layer-gone" });
    expect(await removeAnnotation("1-1")).toMatchObject({ ok: false, reason: "layer-gone" });
    expect(await annotationStatuses(["1-1"])).toEqual({});
    expect(
      await setAltNote("1-1", { text: "x", decorative: false, source: "designer" })
    ).toMatchObject({
      saved: false
    });
  });

  it("says why for a layer that is gone, cannot hold annotations, has no note or has a reserved text", async () => {
    expect(await annotateNode("nope")).toMatchObject({ ok: false, reason: "layer-gone" });
    must(fake.nodes.get("1:1")).removed = true;
    expect(await annotateNode("1:1")).toMatchObject({ ok: false, reason: "layer-gone" });
    must(fake.nodes.get("1:1")).removed = false;

    const group = fake.addNode("g", []);
    delete (group as unknown as Record<string, unknown>).annotations;
    giveNote(group, altNote("A group"));
    expect(await annotateNode("g")).toMatchObject({ ok: false, reason: "layer-type" });

    const bare = fake.addNode("2:2", []);
    expect(await annotateNode("2:2")).toMatchObject({ ok: false, reason: "no-note" });
    for (const text of ["2.2", "! 3.1 x2", "."]) {
      giveNote(bare, altNote(text));
      expect(await annotateNode("2:2")).toMatchObject({ ok: false, reason: "reserved-text" });
    }
    expect(bare.annotations).toEqual([]);
  });

  it("reports a file Figma will not write to as read-only", async () => {
    fake.state.readOnly = true;
    expect(await annotateNode("1:1")).toMatchObject({ ok: false, reason: "read-only" });
    expect(storedAlt()?.annotated).toBeUndefined();
  });

  it("does not record an annotation when the note could not be saved", async () => {
    giveNote(node, altNote("x".repeat(1000)));
    fake.state.readOnly = false;
    const spy = vi
      .spyOn(figma.root as unknown as { setPluginData: () => void }, "setPluginData")
      .mockImplementation(() => {
        throw new Error("nope");
      });
    const result = await annotateNode("1:1");
    spy.mockRestore();
    expect(result).toMatchObject({ ok: false, reason: "note-not-saved" });
    expect(labelsOf(node)).toEqual(["Keep the corners square"]);
    expect(fake.commitUndo).not.toHaveBeenCalled();
  });
});
