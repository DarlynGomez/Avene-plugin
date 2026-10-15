import { describe, expect, it } from "vitest";
import { decideRole } from "./roleRules";
import { inputsFor, taskALayers } from "./testing/taskLayers";

/**
 * Every text layer of the Lakeside Cafe task file (screens A1 and A2), with the names its id gives it.
 * The expected answers were worked out by hand from the rule table, not copied from a run. The
 * research team's own role for each layer is in the third column, and a rule may only agree with it
 * or decline to answer.
 */
const EXPECTED: [string, string, string | null][] = [
  ["A1.title", "heading", "N4"],
  ["A1.subtitle", "caption", "N3"],
  ["A1.watermark", "decorative", "N2"],
  ["A1.tagline", "unsure", null],
  ["A1.section", "heading", "S2"],
  ["A1.card1.name", "unsure", null],
  ["A1.card1.desc", "unsure", null],
  ["A1.card1.caption", "caption", "N3"],
  ["A1.card1.price", "unsure", null],
  ["A1.card1.button.label", "button text", "N1"],
  ["A1.card2.name", "unsure", null],
  ["A1.card2.desc", "unsure", null],
  ["A1.card2.caption", "caption", "N3"],
  ["A1.card2.price", "unsure", null],
  ["A1.card2.button.label", "button text", "N1"],
  ["A1.card3.name", "unsure", null],
  ["A1.card3.desc", "unsure", null],
  ["A1.card3.caption", "caption", "N3"],
  ["A1.card3.price", "unsure", null],
  ["A1.card3.button.label", "button text", "N1"],
  ["A2.title", "heading", "N4"],
  ["A2.heading", "heading", "N4"],
  ["A2.card.item1", "unsure", null],
  ["A2.card.price1", "unsure", null],
  ["A2.card.item2", "unsure", null],
  ["A2.card.price2", "unsure", null],
  ["A2.card.totallabel", "unsure", null],
  ["A2.card.total", "unsure", null],
  ["A2.card.note1", "caption", "S4"],
  ["A2.card.note2", "caption", "S4"],
  ["A2.button.label", "button text", "N1"]
];

const rows = taskALayers();

describe("the rules over the real task layers", () => {
  it("covers every layer of the file", () => {
    expect(EXPECTED.map(([id]) => id)).toEqual(rows.map((row) => row.id));
  });

  it.each(EXPECTED)("%s is %s by %s", (id, role, ruleId) => {
    const row = rows.find((candidate) => candidate.id === id);
    if (!row) throw new Error(id);
    const decision = decideRole(inputsFor(row, rows));
    expect(decision.role).toBe(role);
    expect(decision.ruleId).toBe(ruleId);
    expect(decision.reason.length).toBeGreaterThan(0);
  });

  it("never disagrees with the research team, it only declines", () => {
    for (const row of rows) {
      const decision = decideRole(inputsFor(row, rows));
      expect(decision.role === "unsure" || decision.role === row.role).toBe(true);
    }
  });

  it("decides 15 of the 31 layers and leaves 16 for the model path", () => {
    const decided = rows.filter((row) => decideRole(inputsFor(row, rows)).role !== "unsure");
    expect(decided).toHaveLength(15);
  });

  it("says why, in the words the participant will read", () => {
    const reasons = Object.fromEntries(
      rows.map((row) => [row.id, decideRole(inputsFor(row, rows)).reason])
    );
    expect(reasons["A1.title"]).toBe('Its layer name says it is a heading: "title".');
    expect(reasons["A1.subtitle"]).toBe('Its layer name says it is a note: "subtitle".');
    expect(reasons["A1.watermark"]).toBe('Its layer name says it is decoration: "watermark".');
    expect(reasons["A1.card1.button.label"]).toBe('It sits inside "button" and the text is short.');
    expect(reasons["A1.section"]).toBe(
      "It is much larger than the main text on this screen and short."
    );
    expect(reasons["A2.card.note1"]).toBe(
      "It is smaller than the main text on this screen and more than a couple of words."
    );
    expect(reasons["A1.card1.name"]).toBe("No rule decided what kind of text this is.");
  });
});
