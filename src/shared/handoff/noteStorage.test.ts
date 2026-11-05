import { describe, expect, it } from "vitest";

import { ENTRY_VALUE_MAX_BYTES, NOTE_TEXT_MAX_CHARS, fits, utf8Length } from "./limits";
import {
  cleanNotes,
  noteSource,
  parseIndex,
  parseNodeNotes,
  removeNote,
  serializeIndex,
  serializeNodeNotes,
  upsertNote,
  type NodeNote
} from "./noteStorage";

const AT = "2026-10-28T10:00:00.000Z";
const alt: NodeNote = { category: "alt", text: "Volunteer handing over a parcel", updatedAt: AT };
const heading: NodeNote = { category: "heading", text: "Payment", headingLevel: 1, updatedAt: AT };
const question: NodeNote = {
  category: "question",
  text: "Where does focus go",
  owner: "Dev",
  updatedAt: AT
};

describe("node notes", () => {
  it("round trips every category", () => {
    const notes: NodeNote[] = [
      alt,
      heading,
      { category: "name", text: "Delete draft", updatedAt: AT },
      { category: "state", text: "Focus state missing", updatedAt: AT },
      question
    ];
    expect(parseNodeNotes(serializeNodeNotes(notes))).toEqual(notes);
  });

  it("keeps a decorative alt with empty text", () => {
    const decorative: NodeNote = {
      category: "alt",
      text: "ignored",
      decorative: true,
      updatedAt: AT
    };
    expect(parseNodeNotes(serializeNodeNotes([decorative]))).toEqual([
      { category: "alt", text: "", decorative: true, updatedAt: AT }
    ]);
  });

  it("keeps one note per category, the last wins", () => {
    const later = { ...alt, text: "Newer" };
    expect(upsertNote([alt, heading], later)).toEqual([later, heading]);
    expect(removeNote([alt, heading], "alt")).toEqual([heading]);
  });

  it("cuts text over the cap and drops bad entries", () => {
    const long = { ...alt, text: "x".repeat(NOTE_TEXT_MAX_CHARS + 50) };
    expect(parseNodeNotes(serializeNodeNotes([long]))[0].text).toHaveLength(NOTE_TEXT_MAX_CHARS);
    const bad = [
      { ...heading, headingLevel: 7 },
      { ...question, owner: "Boss" },
      { category: "other", text: "x", updatedAt: AT },
      { ...alt, text: "   " },
      null,
      "text"
    ];
    expect(serializeNodeNotes(bad)).toBe("");
  });

  it("gives nothing for empty, foreign or broken data", () => {
    expect(parseNodeNotes("")).toEqual([]);
    expect(parseNodeNotes("{nope")).toEqual([]);
    expect(parseNodeNotes(JSON.stringify({ v: 2, notes: [alt] }))).toEqual([]);
    expect(serializeNodeNotes([])).toBe("");
  });
});

describe("notes index", () => {
  it("is sorted ids without repeats, and empty when there are none", () => {
    expect(parseIndex(serializeIndex(["2:1", "1:1", "2:1"]))).toEqual(["1:1", "2:1"]);
    expect(serializeIndex([])).toBe("");
    expect(parseIndex("[1,2]")).toEqual([]);
    expect(parseIndex("{broken")).toEqual([]);
  });
});

describe("note source", () => {
  const AT = "2026-11-04T10:00:00.000Z";
  const alt = (extra: Record<string, unknown> = {}) => ({
    category: "alt",
    text: "A sign",
    updatedAt: AT,
    ...extra
  });

  it("reads a note with no source as the designer's and leaves it off the stored form", () => {
    const [note] = cleanNotes([alt()]);
    expect(noteSource(note)).toBe("designer");
    expect("source" in note).toBe(false);
    expect(serializeNodeNotes([alt()])).not.toContain("source");
  });

  it("round trips ai and ai_edited, and reads an unknown source as the designer's", () => {
    for (const source of ["ai", "ai_edited"] as const) {
      const [back] = parseNodeNotes(serializeNodeNotes([alt({ source })]));
      expect(back.source).toBe(source);
      expect(noteSource(back)).toBe(source);
    }
    expect(noteSource(cleanNotes([alt({ source: "model" })])[0])).toBe("designer");
  });

  it("keeps a source only on an alt note, and never on a decorative one", () => {
    expect(
      cleanNotes([{ category: "name", text: "Menu", updatedAt: AT, source: "ai" }])[0].source
    ).toBeUndefined();
    expect(cleanNotes([alt({ decorative: true, source: "ai" })])[0].source).toBeUndefined();
  });

  it("stays well under the entry limit with the longest text, the source and a contact", () => {
    const text = "\u{1F600}".repeat(NOTE_TEXT_MAX_CHARS);
    const raw = serializeNodeNotes([alt({ text, source: "ai_edited", contact: "x".repeat(200) })]);
    expect(fits(raw)).toBe(true);
    expect(utf8Length(raw)).toBeLessThan(ENTRY_VALUE_MAX_BYTES / 10);
  });
});
