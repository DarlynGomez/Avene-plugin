import { describe, expect, it } from "vitest";

import { NOTE_TEXT_MAX_CHARS } from "./limits";
import {
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
