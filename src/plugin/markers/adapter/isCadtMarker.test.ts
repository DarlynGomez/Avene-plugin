import { describe, expect, it } from "vitest";

import { isCadtMarker, type MarkerScope } from "./isCadtMarker";
import { tag } from "./markerFigmaStub";

const node = (data: string) => ({ getPluginData: () => data });
const SCOPE: MarkerScope = {
  userId: "u1",
  sessionId: "s1",
  categoryId: "cat:1",
  existingCategoryIds: new Set(["cat:1", "theirs"])
};
const MINE = node(tag("u1", "s1"));

describe("isCadtMarker", () => {
  it("is true for an annotation in the CADT category on a layer this session tagged", () => {
    expect(isCadtMarker({ label: "anything", categoryId: "cat:1" }, MINE, SCOPE)).toBe(true);
  });

  it("is true when the category is missing from the annotation and the label is a marker label", () => {
    expect(isCadtMarker({ label: "2.2" }, MINE, SCOPE)).toBe(true);
    expect(isCadtMarker({ label: "2.2 x3" }, MINE, SCOPE)).toBe(true);
    expect(isCadtMarker({ label: "! 2.2" }, MINE, SCOPE)).toBe(true);
    expect(isCadtMarker({ label: "! 2.2 x3" }, MINE, SCOPE)).toBe(true);
  });

  it("is true when the category id no longer exists and the label is a marker label", () => {
    expect(isCadtMarker({ label: "2.2", categoryId: "deleted" }, MINE, SCOPE)).toBe(true);
  });

  it("is true for the label of the earlier, longer format, so old leftovers can still be cleaned", () => {
    expect(isCadtMarker({ label: "Contrast 2.17, needs 4.5" }, MINE, SCOPE)).toBe(true);
    expect(
      isCadtMarker({ label: "Important. Contrast 2.17, needs 4.5. 3 layers here" }, MINE, SCOPE)
    ).toBe(true);
  });

  it("works with no CADT category at all", () => {
    const none: MarkerScope = { ...SCOPE, categoryId: null, existingCategoryIds: new Set() };

    expect(isCadtMarker({ label: "2.2" }, MINE, none)).toBe(true);
    expect(isCadtMarker({ label: "Check with Sam" }, MINE, none)).toBe(false);
  });

  it("is false for a designer's own annotation with a different label on a tagged layer", () => {
    expect(isCadtMarker({ label: "Spacing is intentional" }, MINE, SCOPE)).toBe(false);
    expect(
      isCadtMarker({ label: "Spacing is intentional", categoryId: "deleted" }, MINE, SCOPE)
    ).toBe(false);
    expect(isCadtMarker({}, MINE, SCOPE)).toBe(false);
  });

  it("is false for an annotation in another category that exists, even with a marker looking label", () => {
    expect(isCadtMarker({ label: "2.2", categoryId: "theirs" }, MINE, SCOPE)).toBe(false);
    expect(isCadtMarker({ label: "Note", categoryId: "theirs" }, MINE, SCOPE)).toBe(false);
  });

  it("is false on a layer with no tag, another user's tag or an unreadable one", () => {
    const annotation = { label: "2.2", categoryId: "cat:1" };

    expect(isCadtMarker(annotation, node(""), SCOPE)).toBe(false);
    expect(isCadtMarker(annotation, node(tag("u2", "s1")), SCOPE)).toBe(false);
    expect(isCadtMarker(annotation, node("{broken"), SCOPE)).toBe(false);
  });

  it("is false for another session of this user when the scope names a session", () => {
    expect(isCadtMarker({ label: "2.2" }, node(tag("u1", "earlier")), SCOPE)).toBe(false);
  });

  it("is true for any session of this user when the scope names none, as the launch sweep does", () => {
    const sweep: MarkerScope = { ...SCOPE, sessionId: null };

    expect(isCadtMarker({ label: "2.2" }, node(tag("u1", "earlier")), sweep)).toBe(true);
    expect(isCadtMarker({ label: "2.2" }, node(tag("u2", "earlier")), sweep)).toBe(false);
  });
});
