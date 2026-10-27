import { describe, expect, it } from "vitest";

import {
  ENTRY_VALUE_MAX_BYTES,
  META_LONG_MAX_CHARS,
  META_SHORT_MAX_CHARS,
  NOTE_TEXT_MAX_CHARS,
  cutChars,
  fits,
  utf8Length
} from "./limits";
import { serializeMeta } from "./metaStorage";
import { NOTE_CATEGORIES, serializeIndex, serializeNodeNotes } from "./noteStorage";

/** Figma's limit counts id, key and value, and is 100 kB */
const FIGMA_ENTRY_LIMIT = 100 * 1000;
/** The widest characters, four bytes each, written as an escape */
const WIDE = "\u{10000}";
const AT = "2026-10-28T10:00:00.000Z";

describe("utf8Length", () => {
  it("counts one to four bytes", () => {
    expect(utf8Length("a")).toBe(1);
    expect(utf8Length("é")).toBe(2);
    expect(utf8Length("€")).toBe(3);
    expect(utf8Length(WIDE)).toBe(4);
    expect(utf8Length("")).toBe(0);
  });
});

describe("cutChars", () => {
  it("cuts by whole characters and never splits a pair", () => {
    expect(cutChars("abcdef", 3)).toBe("abc");
    expect(cutChars(WIDE.repeat(5), 2)).toBe(WIDE.repeat(2));
    expect(cutChars("abc", 10)).toBe("abc");
  });
});

describe("size bounds", () => {
  it("keeps the guard well under the entry limit", () => {
    expect(ENTRY_VALUE_MAX_BYTES).toBeLessThan(FIGMA_ENTRY_LIMIT);
  });

  it("holds a layer's five widest notes far under the guard", () => {
    const notes = NOTE_CATEGORIES.map((category) => ({
      category,
      text: WIDE.repeat(NOTE_TEXT_MAX_CHARS),
      headingLevel: 1,
      owner: "Dev",
      updatedAt: AT
    }));
    const bytes = utf8Length(serializeNodeNotes(notes));
    expect(bytes).toBeGreaterThan(5 * NOTE_TEXT_MAX_CHARS * 4);
    expect(bytes).toBeLessThan(ENTRY_VALUE_MAX_BYTES / 2);
  });

  it("holds one widest meta entry in about a sixth of the guard, so a few fit and no more", () => {
    const entry = {
      signOff: "signed",
      leaveOut: true,
      revisitTrigger: WIDE.repeat(META_LONG_MAX_CHARS),
      mitigation: WIDE.repeat(META_LONG_MAX_CHARS),
      decidedBy: WIDE.repeat(META_SHORT_MAX_CHARS),
      signedBy: WIDE.repeat(META_SHORT_MAX_CHARS),
      signedAt: WIDE.repeat(META_SHORT_MAX_CHARS)
    };
    const one = utf8Length(serializeMeta({ "#AAAAAA|#FFFFFF|unbound|4.5": entry }));
    expect(one).toBeLessThan(ENTRY_VALUE_MAX_BYTES / 5);
    const many = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`sig${i}`, entry]));
    expect(fits(serializeMeta(many))).toBe(false);
  });

  it("holds a hundred ordinary meta entries under the guard", () => {
    const entries = Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [
        `#${String(100000 + i)}|#FFFFFF|text/muted-${i}|4.5`,
        {
          signOff: "signed",
          leaveOut: false,
          mitigation: "m".repeat(300),
          revisitTrigger: "r".repeat(100),
          decidedBy: "Sam Lee",
          signedBy: "Jo PM",
          signedAt: AT
        }
      ])
    );
    expect(utf8Length(serializeMeta(entries))).toBeLessThan(ENTRY_VALUE_MAX_BYTES);
  });

  it("holds thousands of node ids in the index", () => {
    const ids = (count: number) =>
      Array.from({ length: count }, (_, i) => `${100 + (i % 900)}:${1000 + i}`);
    expect(fits(serializeIndex(ids(4000)))).toBe(true);
    expect(fits(serializeIndex(ids(6000)))).toBe(false);
  });
});
