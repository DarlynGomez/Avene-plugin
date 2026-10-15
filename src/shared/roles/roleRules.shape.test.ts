import { describe, expect, it } from "vitest";
import type { RoleInputs } from "./roleInputs";
import { decideRole } from "./roleRules";
import { bodyCensus, layer, UNNAMED } from "./testing/fixtures";

const run = (input: RoleInputs) => {
  const { role, ruleId } = decideRole(input);
  return [role, ruleId];
};

/**
 * Tier B cases. Each starts from a real layer of the Lakeside Cafe task file with its names removed,
 * as a designer who never renamed a layer would have, so only its shape speaks.
 */
describe("S1, button text from a small filled shape", () => {
  // A1.card1.button.label: 14px, weight 500, "Add", in a filled frame 88 by 40
  const add = { ...layer("A1.card1.button.label"), ...UNNAMED };
  it("decides a few words in a small filled frame", () => {
    expect(run(add)).toEqual(["button text", "S1"]);
    expect(decideRole(add).reason).toBe(
      "It sits in a small filled shape and is only a few words, like a button."
    );
  });
  it("allows a frame 72 tall and not 73", () => {
    expect(run({ ...add, parentHeight: 72 })).toEqual(["button text", "S1"]);
    expect(run({ ...add, parentHeight: 73 })).not.toEqual(["button text", "S1"]);
  });
  it("allows 4 words and not 5", () => {
    expect(run({ ...add, wordCount: 4 })).toEqual(["button text", "S1"]);
    expect(run({ ...add, wordCount: 5 })).not.toEqual(["button text", "S1"]);
  });
  it("needs a frame wider than the text, a fill, and a known height", () => {
    expect(run({ ...add, parentWidth: add.textWidth })).not.toEqual(["button text", "S1"]);
    expect(run({ ...add, parentHasSolidFill: false })).not.toEqual(["button text", "S1"]);
    expect(run({ ...add, parentHeight: null })).not.toEqual(["button text", "S1"]);
    expect(run({ ...add, parentWidth: null })).not.toEqual(["button text", "S1"]);
  });
  it("comes before S2, so a large word on a small filled frame is a button", () => {
    expect(run({ ...add, fontSizePx: 40, wordCount: 1, parentHeight: 60 })).toEqual([
      "button text",
      "S1"
    ]);
  });
});

describe("S2 and S3, headings from size and weight", () => {
  // A1.section: 28px, weight 400, "Today's specials", screen body text 14px
  const section = { ...layer("A1.section"), ...UNNAMED, parentHasSolidFill: false };
  // A1.card1.name: 16px, weight 600, "Avocado Toast"
  const name = { ...layer("A1.card1.name"), ...UNNAMED, parentHasSolidFill: false };
  it("decides S2 from a size 1.5 times the body, exactly", () => {
    expect(run(section)).toEqual(["heading", "S2"]);
    expect(run({ ...section, fontSizePx: 21 })).toEqual(["heading", "S2"]);
    expect(run({ ...section, fontSizePx: 20.9 })).toEqual(["unsure", null]);
  });
  it("allows 10 words for S2 and not 11", () => {
    expect(run({ ...section, wordCount: 10 })).toEqual(["heading", "S2"]);
    expect(run({ ...section, wordCount: 11 })).toEqual(["unsure", null]);
  });
  it("leaves the real card names to the model, they are 1.14 times the body", () => {
    expect(run(name)).toEqual(["unsure", null]);
  });
  it("decides S3 from weight 600 and a size 1.2 times the body", () => {
    const bold = { ...name, screenTextCensus: bodyCensus(13) };
    expect(run(bold)).toEqual(["heading", "S3"]);
    expect(decideRole(bold).reason).toBe(
      "It is bolder and larger than the main text on this screen and short."
    );
    expect(run({ ...name, screenTextCensus: bodyCensus(14), fontSizePx: 16.8 })).toEqual([
      "heading",
      "S3"
    ]);
    expect(run({ ...name, screenTextCensus: bodyCensus(14), fontSizePx: 16.7 })).toEqual([
      "unsure",
      null
    ]);
  });
  it("needs weight 600 and not 599, and a known weight", () => {
    const bold = { ...name, screenTextCensus: bodyCensus(13) };
    expect(run({ ...bold, fontWeight: 599 })).toEqual(["unsure", null]);
    expect(run({ ...bold, fontWeight: 600 })).toEqual(["heading", "S3"]);
    expect(run({ ...bold, fontWeight: null })).toEqual(["unsure", null]);
  });
  it("allows 10 words for S3 and not 11", () => {
    const bold = { ...name, screenTextCensus: bodyCensus(13) };
    expect(run({ ...bold, wordCount: 10 })).toEqual(["heading", "S3"]);
    expect(run({ ...bold, wordCount: 11 })).toEqual(["unsure", null]);
  });
});

describe("S4, a caption from a smaller size", () => {
  // A2.card.note1: 12px, weight 400, "Pickup at 4:30 pm", screen body text 16px
  const note = { ...layer("A2.card.note1"), ...UNNAMED, parentHasSolidFill: false };
  it("decides a note 0.9 times the body or less, exactly", () => {
    expect(run(note)).toEqual(["caption", "S4"]);
    expect(run({ ...note, fontSizePx: 14.4 })).toEqual(["caption", "S4"]);
    expect(run({ ...note, fontSizePx: 14.5 })).toEqual(["unsure", null]);
  });
  it("needs 3 words and a weight below 600", () => {
    expect(run({ ...note, wordCount: 3 })).toEqual(["caption", "S4"]);
    expect(run({ ...note, wordCount: 2 })).toEqual(["unsure", null]);
    expect(run({ ...note, fontWeight: 600 })).toEqual(["unsure", null]);
    expect(run({ ...note, fontWeight: null })).toEqual(["unsure", null]);
  });
  it("uses position only here, a small note in the bottom 12 percent of the screen", () => {
    const foot = { ...note, wordCount: 2 };
    expect(run({ ...foot, centerYFraction: 0.88 })).toEqual(["caption", "S4"]);
    expect(decideRole({ ...foot, centerYFraction: 0.88 }).reason).toBe(
      "It is small and sits at the bottom of the screen."
    );
    expect(run({ ...foot, centerYFraction: 0.87 })).toEqual(["unsure", null]);
    expect(run({ ...foot, centerYFraction: null })).toEqual(["unsure", null]);
  });
  it("does not let position decide anything but a small note", () => {
    const low = {
      ...layer("A1.card1.price"),
      ...UNNAMED,
      parentHasSolidFill: false,
      centerYFraction: 0.95
    };
    expect(run(low)).toEqual(["unsure", null]);
    expect(run({ ...low, ...{ fontWeight: 600, fontSizePx: 12 } })).toEqual(["unsure", null]);
  });
});

describe("S5, body text from the main size and several words", () => {
  // A1.card1.desc: 14px, weight 400, three words, with a real sentence of eight words in its place
  const desc = {
    ...layer("A1.card1.desc"),
    ...UNNAMED,
    parentHasSolidFill: false,
    wordCount: 8,
    charCount: 50
  };
  it("decides eight words at the main size", () => {
    expect(run(desc)).toEqual(["body", "S5"]);
    expect(decideRole(desc).reason).toBe(
      "It is the same size as the main text on this screen and runs to several words."
    );
    expect(run({ ...desc, wordCount: 7 })).toEqual(["unsure", null]);
  });
  it("leaves the real three word descriptions to the model", () => {
    expect(run({ ...desc, wordCount: 3 })).toEqual(["unsure", null]);
  });
  it("excludes a ratio of 0.9 and of 1.2 themselves", () => {
    const census = bodyCensus(14);
    expect(run({ ...desc, screenTextCensus: census, fontSizePx: 14.7 })).toEqual(["body", "S5"]);
    expect(run({ ...desc, screenTextCensus: census, fontSizePx: 12.6 })).toEqual(["caption", "S4"]);
    expect(run({ ...desc, screenTextCensus: census, fontSizePx: 16.8 })).toEqual(["unsure", null]);
    expect(run({ ...desc, screenTextCensus: census, fontSizePx: 16.7 })).toEqual(["body", "S5"]);
  });
  it("needs a weight below 600 and a known weight", () => {
    expect(run({ ...desc, fontWeight: 600 })).toEqual(["unsure", null]);
    expect(run({ ...desc, fontWeight: null })).toEqual(["unsure", null]);
  });
});

describe("what must come back unsure", () => {
  const body = { ...layer("A1.card1.desc"), ...UNNAMED, parentHasSolidFill: false, wordCount: 8 };
  it("when the screen has too little text to compare with", () => {
    const three = [
      { fontSizePx: 14, charCount: 100 },
      { fontSizePx: 28, charCount: 10 },
      { fontSizePx: 12, charCount: 10 }
    ];
    expect(run({ ...body, screenTextCensus: three })).toEqual(["unsure", null]);
    const short = [
      { fontSizePx: 14, charCount: 40 },
      { fontSizePx: 14, charCount: 20 },
      { fontSizePx: 28, charCount: 10 },
      { fontSizePx: 12, charCount: 9 }
    ];
    expect(run({ ...body, screenTextCensus: short })).toEqual(["unsure", null]);
    expect(run({ ...body, screenTextCensus: [] })).toEqual(["unsure", null]);
  });
  it("when the font size is mixed or the text is empty", () => {
    expect(run({ ...body, fontSizePx: null })).toEqual(["unsure", null]);
    expect(run({ ...body, charCount: 0, wordCount: 0 })).toEqual(["unsure", null]);
  });
  it("when a name rule fails its word limit and nothing else speaks", () => {
    const long = { ...layer("A1.title"), wordCount: 20, screenTextCensus: [] };
    expect(decideRole(long)).toMatchObject({ role: "unsure", undecided: "none" });
  });
  it("and says so without naming a rule", () => {
    expect(decideRole({ ...body, wordCount: 3 })).toEqual({
      role: "unsure",
      ruleId: null,
      reason: "No rule decided what kind of text this is.",
      undecided: "none"
    });
  });
  it("never runs the shape rules after a conflict", () => {
    const section = { ...layer("A1.section"), layerName: "caption title" };
    expect(decideRole(section)).toMatchObject({ role: "unsure", undecided: "conflict" });
  });
  it("lets a name rule win over shape", () => {
    expect(run({ ...layer("A1.card1.price"), layerName: "caption" })).toEqual(["caption", "N3"]);
  });
});
