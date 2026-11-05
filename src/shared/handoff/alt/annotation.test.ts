import { describe, expect, it } from "vitest";

import { cleanNotes, parseNodeNotes, serializeNodeNotes, type NodeNote } from "../noteStorage";
import { applyAlt, clearsAnnotatedNote } from "./altNote";
import { clearAnnotated, markAnnotated, readAnnotationFields } from "./annotationFields";
import { isAnnotationPluginMessage, isAnnotationUiMessage } from "./annotationMessages";
import { annotationStatus, type ObservedAnnotation } from "./annotationStatus";
import {
  DECORATIVE_ANNOTATION_TEXT,
  annotationTextOf,
  isReservedAnnotationText,
  labelHash,
  normalizeLabel
} from "./annotationText";

const AT = "2026-11-05T10:00:00.000Z";
const alt = (extra: Partial<NodeNote> = {}): NodeNote => ({
  category: "alt",
  text: "A cafe sign",
  updatedAt: AT,
  ...extra
});
const written = (text = "A cafe sign"): NodeNote =>
  alt({ text, annotated: true, annotatedAt: AT, annotatedHash: labelHash("A cafe sign") });
const seen = (over: Partial<ObservedAnnotation> = {}): ObservedAnnotation => ({
  supported: true,
  matched: false,
  inCategory: 0,
  ...over
});

describe("annotationStatus", () => {
  it("is none for no note, a note of another kind, and an old note with no annotation fields", () => {
    expect(annotationStatus(undefined, seen())).toBe("none");
    expect(annotationStatus({ category: "name", text: "Menu", updatedAt: AT }, seen())).toBe(
      "none"
    );
    expect(annotationStatus(alt(), seen())).toBe("none");
  });

  it("is in-sync when ours is there and the note still says what it says", () => {
    expect(annotationStatus(written(), seen({ matched: true, inCategory: 1 }))).toBe("in-sync");
  });

  it("is out-of-date when the note text changed", () => {
    expect(annotationStatus(written("A new text"), seen({ matched: true, inCategory: 1 }))).toBe(
      "out-of-date"
    );
  });

  it("is out-of-date when the annotation in our category was edited on the canvas", () => {
    expect(annotationStatus(written(), seen({ matched: false, inCategory: 1 }))).toBe(
      "out-of-date"
    );
  });

  it("is missing when we recorded one and none is in our category", () => {
    expect(annotationStatus(written(), seen())).toBe("missing");
  });

  it("is unsupported for a layer that cannot hold annotations, with or without a record", () => {
    expect(annotationStatus(alt(), seen({ supported: false }))).toBe("unsupported");
    expect(annotationStatus(written(), seen({ supported: false }))).toBe("unsupported");
  });

  it("is out-of-date when a note became decorative after the text was written", () => {
    const note = { ...written(), text: "", decorative: true };
    expect(annotationStatus(note, seen({ matched: true, inCategory: 1 }))).toBe("out-of-date");
  });
});

describe("annotation text", () => {
  it("is the alt text trimmed, the fixed string for a decorative note, and nothing for an empty one", () => {
    expect(annotationTextOf(alt({ text: "  A sign " }))).toBe("A sign");
    expect(annotationTextOf(alt({ text: "", decorative: true }))).toBe(DECORATIVE_ANNOTATION_TEXT);
    expect(annotationTextOf(alt({ text: "  " }))).toBeNull();
    expect(annotationTextOf({ category: "name", text: "Menu", updatedAt: AT })).toBeNull();
  });

  it("hashes the same words the same way whatever the line endings or edges, and different words differently", () => {
    expect(labelHash(" a\r\nb ")).toBe(labelHash("a\nb"));
    expect(normalizeLabel(" x ")).toBe("x");
    expect(labelHash("A sign")).not.toBe(labelHash("A signs"));
  });

  it("keeps the fixed decorative string clear of marker labels and the words clear of the alt category name rules", () => {
    expect(isReservedAnnotationText(DECORATIVE_ANNOTATION_TEXT)).toBe(false);
    for (const text of ["2.2", "! 3.1", "2.2 x3", ".", "", "  "]) {
      expect(isReservedAnnotationText(text), text).toBe(true);
    }
    expect(isReservedAnnotationText("A cafe sign")).toBe(false);
  });
});

describe("annotation fields on a note", () => {
  it("round trip through storage, and are dropped when partial or on another category", () => {
    const [back] = parseNodeNotes(serializeNodeNotes([written()]));
    expect(back).toMatchObject({
      annotated: true,
      annotatedAt: AT,
      annotatedHash: labelHash("A cafe sign")
    });
    expect(readAnnotationFields({ annotated: true, annotatedAt: AT })).toEqual({});
    expect(readAnnotationFields({ annotated: false, annotatedAt: AT, annotatedHash: "x" })).toEqual(
      {}
    );
    const other = {
      category: "name",
      text: "Menu",
      updatedAt: AT,
      annotated: true,
      annotatedAt: AT,
      annotatedHash: "x"
    };
    expect("annotated" in cleanNotes([other])[0]).toBe(false);
  });

  it("an old note without them reads as having none, and stays the same when stored again", () => {
    const [old] = parseNodeNotes(serializeNodeNotes([alt()]));
    expect(old.annotated).toBeUndefined();
    expect(serializeNodeNotes([old])).toBe(serializeNodeNotes([alt()]));
  });

  it("mark and clear touch only the alt note", () => {
    const name: NodeNote = { category: "name", text: "Menu", updatedAt: AT };
    const marked = markAnnotated([alt(), name], AT, "h");
    expect(marked[0]).toMatchObject({ annotated: true, annotatedHash: "h" });
    expect(marked[1]).toBe(name);
    expect(clearAnnotated(marked)[0].annotated).toBeUndefined();
  });

  it("are kept when the alt text changes, and clearing an annotated note is refused", () => {
    const next = applyAlt([written()], { text: "New", decorative: false, source: "designer" }, AT);
    expect(next[0]).toMatchObject({
      text: "New",
      annotated: true,
      annotatedHash: labelHash("A cafe sign")
    });
    expect(
      clearsAnnotatedNote([written()], { text: " ", decorative: false, source: "designer" })
    ).toBe(true);
    expect(clearsAnnotatedNote([alt()], { text: " ", decorative: false, source: "designer" })).toBe(
      false
    );
    expect(
      clearsAnnotatedNote([written()], { text: "", decorative: true, source: "designer" })
    ).toBe(false);
  });

  it("stay well under the entry limit with the longest text and every field", () => {
    const long = alt({
      text: "\u{1F600}".repeat(1000),
      source: "ai_edited",
      annotated: true,
      annotatedAt: AT,
      annotatedHash: "abcd1234"
    });
    expect(serializeNodeNotes([long]).length).toBeLessThan(6000);
  });
});

describe("annotation messages", () => {
  it("take one layer for every write and a list only for the status read", () => {
    for (const type of [
      "HANDOFF_ANNOTATE",
      "HANDOFF_ANNOTATION_UPDATE",
      "HANDOFF_ANNOTATION_REMOVE"
    ]) {
      expect(isAnnotationUiMessage({ type, nodeId: "1:1" })).toBe(true);
      expect(isAnnotationUiMessage({ type, nodeIds: ["1:1"] })).toBe(false);
      expect(isAnnotationUiMessage({ type, nodeId: 4 })).toBe(false);
    }
    expect(
      isAnnotationUiMessage({ type: "HANDOFF_ANNOTATION_STATUS_REQUEST", nodeIds: ["1:1"] })
    ).toBe(true);
    expect(isAnnotationUiMessage({ type: "HANDOFF_ANNOTATION_STATUS_REQUEST", nodeIds: [1] })).toBe(
      false
    );
    expect(isAnnotationUiMessage({ type: "HANDOFF_ANNOTATE_ALL" })).toBe(false);
  });

  it("recognise the replies and the refusal", () => {
    expect(isAnnotationPluginMessage({ type: "HANDOFF_ANNOTATION_REFUSED" })).toBe(true);
    expect(isAnnotationPluginMessage({ type: "HANDOFF_ANNOTATION_STATUSES", statuses: {} })).toBe(
      true
    );
    expect(
      isAnnotationPluginMessage({
        type: "HANDOFF_ANNOTATION_RESULT",
        nodeId: "1",
        ok: false,
        reason: "layer-gone"
      })
    ).toBe(true);
    expect(isAnnotationPluginMessage({ type: "HANDOFF_REFUSED" })).toBe(false);
  });
});
