import { describe, expect, it } from "vitest";

import { buildAudienceDoc } from "../audiences";
import { NOT_COVERED_LINE, CLIENT_LINE, HIGHER_UP_LINE, NOT_REVIEWED_LINE } from "../fixedLines";
import { rawText } from "../formats";
import { displayLabel } from "../labels";
import type { Audience } from "../types";
import { FIXTURE_NOTES, fixtureInput } from "./altFixture";

const AUDIENCES: readonly Audience[] = ["developer", "pm", "higherUp", "client"];
const reviewer = { name: "Sam Lee", date: "2026-11-05T13:00:00.000Z" };
const HEX = /#[0-9A-Fa-f]{3,8}\b/;

const copy = (audience: Audience) => rawText("spec", fixtureInput(), audience, {}, reviewer);
const quick = (audience: Audience) => rawText("spec", fixtureInput(), audience, {}, null, true);

describe("the fixture file, in every version", () => {
  it("has the shape the checks assume", () => {
    const doc = buildAudienceDoc(fixtureInput(), "developer");
    expect(doc.sections.find((s) => s.id === "action")?.groups?.length).toBeGreaterThan(0);
    expect(FIXTURE_NOTES).toHaveLength(3);
  });

  it("has no hex value in the PM, higher-up or client version, whatever the designer wrote", () => {
    for (const audience of ["pm", "higherUp", "client"] as const) {
      expect(copy(audience), audience).not.toMatch(HEX);
      expect(quick(audience), audience).not.toMatch(HEX);
    }
  });

  it("keeps the designer's hex in the developer version only, where hex belongs", () => {
    expect(copy("developer")).toContain("#FF7A1A on white");
    for (const audience of ["pm", "higherUp", "client"] as const) {
      expect(copy(audience)).not.toContain("Brand swatch");
    }
  });

  it("finds no designer text hits in the other versions, because alt notes are not printed there", () => {
    for (const audience of ["pm", "higherUp", "client"] as const) {
      expect(buildAudienceDoc(fixtureInput(), audience).warnings.map((w) => w.field)).not.toContain(
        "alt"
      );
    }
  });

  it("prints alt notes only in the developer version, with the Needs check line for the layer with no note", () => {
    const dev = copy("developer").split("\n");
    expect(dev).toContain('Decision: Alt text for "Hero banner": Brand swatch #FF7A1A on white');
    expect(dev).toContain('Decision: "Background pattern" is decorative, alt is empty');
    expect(dev).toContain(
      "Needs check: 1 image layer has no alt text note or decorative mark yet. Avene cannot judge alt text quality."
    );
    for (const audience of ["pm", "higherUp", "client"] as const) {
      const text = copy(audience);
      expect(text, audience).not.toContain("Alt text for");
      expect(text, audience).not.toContain("image layer");
      expect(text, audience).not.toContain("decorative");
    }
  });

  it("keeps the AI-drafted label through the copy, with the reviewer, and without one in the quick copy", () => {
    expect(copy("developer")).toContain(
      'Alt text for "Cart icon": Order summary icon that opens the cart (AI-drafted, reviewed by Sam Lee)'
    );
    const quickText = quick("developer");
    expect(quickText).toContain("(AI-drafted, confirmed by the designer)");
    expect(quickText).not.toContain("(AI-drafted, reviewed by");
    expect(quickText.endsWith(NOT_REVIEWED_LINE)).toBe(true);
  });

  it("says in the header of the version that prints alt notes that AI-drafted alt text is included, and in no other", () => {
    expect(copy("developer").split("\n")).toContain("Includes AI-drafted alt text: 1 note");
    for (const audience of ["pm", "higherUp", "client"] as const) {
      expect(copy(audience), audience).not.toContain("AI-drafted");
    }
  });

  it("does not label the designer's own notes as AI-drafted", () => {
    const lines = copy("developer").split("\n");
    const own = lines.filter((l) => l.includes("Brand swatch") || l.includes("Background pattern"));
    expect(own.length).toBeGreaterThan(0);
    for (const line of own) expect(line).not.toContain("AI-drafted");
  });

  it("carries the Not covered line byte for byte in every version, and the fixed notices where they belong", () => {
    for (const audience of AUDIENCES) {
      // Only the label word is shown in the reader's own words, the rest of the line is the fixed text
      const shown = `${displayLabel("Needs check", audience)}${NOT_COVERED_LINE.slice("Needs check".length)}`;
      expect(copy(audience).split("\n"), audience).toContain(shown);
      expect(quick(audience).split("\n"), audience).toContain(shown);
    }
    expect(copy("developer").split("\n")).toContain(NOT_COVERED_LINE);
    expect(copy("client").split("\n")).toContain(CLIENT_LINE);
    expect(copy("higherUp").split("\n")).toContain(HIGHER_UP_LINE);
    expect(copy("developer")).not.toContain(CLIENT_LINE);
  });

  it("starts every body line of every version with a label, the AI suffix adding no line of its own", () => {
    for (const audience of AUDIENCES) {
      const lines = copy(audience).split("\n");
      const body = lines
        .slice(lines.indexOf("") + 1)
        .filter((l) => l !== "" && !l.startsWith("## "));
      const unlabeled = body.filter(
        (l) => !/^(Detected|Decision|Needs check|Measured|Decided|Still to check)/.test(l)
      );
      expect(
        unlabeled.every((l) => l === CLIENT_LINE || l === HIGHER_UP_LINE),
        `${audience}: ${unlabeled}`
      ).toBe(true);
    }
  });
});
