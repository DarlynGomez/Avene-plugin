import { describe, expect, it } from "vitest";

import { applyEdit, warningsFor } from "./editDraft";
import { docFor, reword, sectionOf } from "./draftFixtures";
import { relabel } from "./render";
import { substituteIds } from "./verify/substitute";

function setup(audience: "developer" | "client") {
  const doc = docFor(audience);
  const block = sectionOf(doc, "summary");
  const ctx = { templateLines: block.lines, slots: doc.slots };
  const filled = (substituteIds(reword(block.lines), doc.slots) as { lines: string[] }).lines;
  return { ctx, filled };
}

describe("applyEdit", () => {
  it("keeps a harmless edit with no warnings", () => {
    const { ctx, filled } = setup("developer");
    const result = applyEdit(filled, 0, filled[0].replace("need", "require"), "developer", ctx);
    expect(result.blocked).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.filled[0]).toContain("require");
  });

  it.each([
    ["a digit run", (l: string) => l + " in 3 places"],
    ["a color code", (l: string) => l + " #123ABC"],
    ["a claim", (l: string) => l + " Everything is compliant."]
  ])("does not keep %s", (_name, change) => {
    const { ctx, filled } = setup("developer");
    const result = applyEdit(filled, 0, change(filled[0]), "developer", ctx);
    expect(result.blocked.length).toBeGreaterThan(0);
    expect(result.filled).toEqual(filled);
  });

  it("keeps an edit with a quoted name and warns, and the warning shows again later", () => {
    const { ctx, filled } = setup("developer");
    const result = applyEdit(filled, 0, filled[0] + ' See "Pay now".', "developer", ctx);
    expect(result.blocked).toEqual([]);
    expect(result.warnings.map((w) => w.rule)).toContain("R3");
    expect(warningsFor(result.filled, ctx).map((w) => w.rule)).toContain("R3");
  });

  it("reads plain-word labels back as the canonical ones", () => {
    const { ctx, filled } = setup("client");
    const shown = relabel(filled[0], "client");
    expect(shown.startsWith("Measured:")).toBe(true);
    const result = applyEdit(filled, 0, shown.replace("need", "require"), "client", ctx);
    expect(result.blocked).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.filled[0].startsWith("Detected:")).toBe(true);
  });
});
