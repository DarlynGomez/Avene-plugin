import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";
import { flagRows } from "./flagCheck";

const phrases = ["orange", "overlay", "screen protector"];
const columns = ["key", "text", "fact_ids", "edited_text"];
const make = (...rows: string[][]) => toCsv([columns, ...rows]);

describe("flagRows", () => {
  it("passes a clean row", () => {
    expect(
      flagRows(
        make(["body:low:normal:1", "It is {measured} and needs {required}.", "", ""]),
        phrases
      )
    ).toEqual([]);
  });
  it("flags a percentage and a count outside the slots", () => {
    const flags = flagRows(make(["a", "About 40% of 12 people", "", ""]), phrases);
    expect(flags[0].reasons[0]).toContain("40%, 12");
    expect(flags[0].line).toBe(2);
  });
  it("accepts a number that is in a fact the row used", () => {
    expect(flagRows(make(["a", "The scale runs from 1:1 to 21:1.", "F01", ""]), phrases)).toEqual(
      []
    );
  });
  it("flags a number that is only in a fact the row did not use", () => {
    expect(flagRows(make(["a", "On 83.9% of pages.", "F01", ""]), phrases)).toHaveLength(1);
  });
  it("flags an unknown fact, and not one cleared or read in full", () => {
    expect(flagRows(make(["a", "x", "F16", ""]), phrases)).toEqual([]);
    expect(flagRows(make(["a", "x", "F99", ""]), phrases)[0].reasons[0]).toContain("F99");
    expect(flagRows(make(["a", "x", "F01 F15", ""]), phrases)).toEqual([]);
  });
  it("flags listed phrases whatever the case, in the text or the edited text", () => {
    expect(flagRows(make(["a", "Try an Overlay.", "", ""]), phrases)[0].reasons[0]).toContain(
      "overlay"
    );
    expect(flagRows(make(["a", "x", "", "a screen protector"]), phrases)).toHaveLength(1);
  });
  it("gives every reason for a row and changes nothing", () => {
    const input = make(["a", "40% orange", "F98", ""]);
    const flags = flagRows(input, phrases);
    expect(flags[0].reasons).toHaveLength(3);
    expect(make(["a", "40% orange", "F98", ""])).toBe(input);
  });
});

describe("flagRows, size warning", () => {
  const csv = (key: string, text: string) =>
    toCsv([
      ["key", "text", "fact_ids"],
      [key, text, ""]
    ]);
  it("warns about larger or bigger on a normal size key only", () => {
    expect(flagRows(csv("body:high:normal:3", "Try larger text."), [])[0].reasons).toEqual([
      "warning: larger or bigger on a normal size key"
    ]);
    expect(flagRows(csv("body:high:large:3", "Try larger text."), [])).toEqual([]);
    expect(flagRows(csv("body:high:normal:3", "Try a deeper colour."), [])).toEqual([]);
  });
});

describe("flagRows, direction words", () => {
  it("asks for a second read when darker or lighten appears, and is not a failure", () => {
    const csv = toCsv([
      ["key", "text", "fact_ids"],
      ["body:high:large:3", "Place it on a darker surface or lighten the page.", ""]
    ]);
    expect(flagRows(csv, [])[0].reasons).toEqual(["read twice: darker, lighten"]);
  });
});
