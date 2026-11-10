import { describe, expect, it } from "vitest";

import { buildDoc, renderDoc } from "../buildDoc";
import { finding, input } from "../handoffFixtures";
import { startsWithLabel } from "../labels";
import { createSlots } from "../slots";
import type { HandoffNote } from "../types";
import { aiAltCount, altLines } from "./altLines";

const AT = "2026-11-05T10:00:00.000Z";
const note = (nodeId: string, text: string, source?: "ai" | "ai_edited"): HandoffNote => ({
  nodeId,
  nodeName: `Layer ${nodeId}`,
  note: { category: "alt", text, updatedAt: AT, ...(source ? { source } : {}) }
});
const lines = (notes: HandoffNote[], reviewer?: { name: string }) => {
  const slots = createSlots();
  return { out: altLines(notes, [], slots, reviewer), table: slots.table() };
};

describe("alt lines for notes a model drafted", () => {
  it("end on the same line with the reviewer, for an ai note and an ai_edited one", () => {
    const { out } = lines([note("1", "A sign", "ai"), note("2", "A door", "ai_edited")], {
      name: "Sam Lee"
    });
    expect(out).toEqual([
      'Decision: Alt text for "{L1}": {w1} (AI-drafted, reviewed by {p1})',
      'Decision: Alt text for "{L2}": {w2} (AI-drafted, reviewed by {p1})'
    ]);
  });

  it("say confirmed by the designer when there is no reviewer, as in the quick copy", () => {
    const { out } = lines([note("1", "A sign", "ai")]);
    expect(out).toEqual([
      'Decision: Alt text for "{L1}": {w1} (AI-drafted, confirmed by the designer)'
    ]);
  });

  it("leave a designer's own note exactly as it was, with or without a reviewer", () => {
    expect(lines([note("1", "A sign")], { name: "Sam Lee" }).out).toEqual([
      'Decision: Alt text for "{L1}": {w1}'
    ]);
    expect(lines([note("1", "A sign")]).out).toEqual(['Decision: Alt text for "{L1}": {w1}']);
  });

  it("keep the reviewer's name in a slot, not in the line", () => {
    const { out, table } = lines([note("1", "A sign", "ai")], { name: "Sam Lee" });
    expect(out.join("\n")).not.toContain("Sam");
    expect(Object.values(table)).toContain("Sam Lee");
  });

  it("add no line of their own, every line still starts with a label", () => {
    const { out } = lines([note("1", "A sign", "ai")], { name: "Sam Lee" });
    expect(out).toHaveLength(1);
    expect(out.every((line) => startsWithLabel(line))).toBe(true);
  });

  it("count only answered notes a model drafted", () => {
    const decorative: HandoffNote = {
      nodeId: "9",
      nodeName: "Logo",
      note: { category: "alt", text: "", decorative: true, updatedAt: AT }
    };
    expect(
      aiAltCount([note("1", "A", "ai"), note("2", "B", "ai_edited"), note("3", "C"), decorative])
    ).toBe(2);
  });
});

describe("the document with notes a model drafted", () => {
  const base = (reviewer?: { name: string; date: string }) =>
    buildDoc(
      input({
        findings: [finding()],
        notes: [note("1", "A sign", "ai"), note("2", "A door")],
        ...(reviewer ? { reviewer } : {})
      })
    );

  it("says in the header that AI-drafted alt text is included, with a count", () => {
    expect(base().header).toContain("Includes AI-drafted alt text: 1 note");
    expect(base({ name: "Sam Lee", date: AT }).header).toContain(
      "Includes AI-drafted alt text: 1 note"
    );
  });

  it("has no such header line when every alt note is the designer's", () => {
    const doc = buildDoc(input({ findings: [finding()], notes: [note("2", "A door")] }));
    expect(doc.header.some((line) => line.includes("AI-drafted"))).toBe(false);
  });

  it("prints the reviewer on the line once there is one, and confirmed by the designer without", () => {
    expect(renderDoc(base({ name: "Sam Lee", date: AT }))).toContain(
      "(AI-drafted, reviewed by Sam Lee)"
    );
    expect(renderDoc(base())).toContain("(AI-drafted, confirmed by the designer)");
  });

  it("changes the structure hash when a note becomes AI-drafted, so an old draft is not reused", () => {
    const designer = buildDoc(input({ findings: [finding()], notes: [note("1", "A sign")] }));
    const drafted = buildDoc(input({ findings: [finding()], notes: [note("1", "A sign", "ai")] }));
    expect(designer.structureHash).not.toBe(drafted.structureHash);
  });
});
