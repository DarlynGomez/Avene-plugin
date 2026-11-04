import { describe, expect, it } from "vitest";

import { composeCopy } from "./compose";
import { docFor, reword, sectionOf } from "./draftFixtures";
import { renderAudience } from "./render";
import { substituteIds } from "./verify/substitute";

describe("composeCopy", () => {
  it("is the plain template text when nothing is chosen", () => {
    const doc = docFor("developer");
    expect(composeCopy(doc, {}, "Sam")).toBe(renderAudience(doc));
  });

  it("puts a chosen block in with one attribution line, and says at the top which blocks", () => {
    const doc = docFor("developer");
    const action = sectionOf(doc, "action");
    const filled = (substituteIds(reword(action.lines), doc.slots) as { lines: string[] }).lines;
    const text = composeCopy(doc, { action: filled }, "Sam Lee");
    expect(text).toContain(
      "Parts of this version were drafted by a language model and reviewed by Sam Lee: Needs developer action."
    );
    expect(text).toContain("It is not bound to a variable");
    expect(text.split("(AI-drafted, reviewed by Sam Lee)")).toHaveLength(2);
    const lines = text.split("\n");
    const at = lines.indexOf("(AI-drafted, reviewed by Sam Lee)");
    expect(lines.slice(at - 2, at).join(" ")).toContain("It is not bound");
    expect(lines[at + 1]).toBe("");
  });

  it("shows a chosen block in plain-word labels for a reader who is not a developer", () => {
    const doc = docFor("client");
    const left = sectionOf(doc, "left");
    const filled = (substituteIds(left.lines, doc.slots) as { lines: string[] }).lines;
    const text = composeCopy(doc, { left: filled }, "Sam");
    expect(text).toContain("Measured:");
    expect(text).not.toMatch(/^Detected:/m);
  });

  it("never replaces the fixed Not covered block, even when asked", () => {
    const doc = docFor("developer");
    const text = composeCopy(doc, { notCovered: ["Needs check: Everything is fine."] }, "Sam");
    expect(text).not.toContain("Everything is fine");
    expect(text).not.toContain("drafted by a language model");
  });
});
