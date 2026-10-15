import { describe, expect, it } from "vitest";
import { decideRole } from "./roleRules";
import { layer, UNNAMED } from "./testing/fixtures";

const out = (input: Parameters<typeof decideRole>[0]) => {
  const { role, ruleId } = decideRole(input);
  return [role, ruleId];
};

/**
 * Tier A cases. Each is a real layer of the Lakeside Cafe task file with only the names or the
 * word count changed, as the comment on each says.
 */
describe("N1, button text from a name", () => {
  const add = layer("A1.card1.button.label");
  it("reads the own name when the designer set it", () => {
    const input = {
      ...add,
      layerName: "Add button",
      ancestorNames: ["card1", "A1"],
      parentName: "card1"
    };
    expect(decideRole(input).reason).toBe('Its layer name says it is a button: "Add button".');
  });
  it("reads an ancestor's name, and the nearest ancestor first", () => {
    const input = {
      ...add,
      layerName: "Text",
      autoRename: true,
      ancestorNames: ["Frame 1", "primary button", "Button row"]
    };
    expect(decideRole(input).reason).toBe('It sits inside "primary button" and the text is short.');
  });
  it("reads the component name when no layer name matches", () => {
    const input = { ...add, ...UNNAMED, componentName: "Button/Primary" };
    expect(out(input)).toEqual(["button text", "N1"]);
    expect(decideRole(input).reason).toBe('It sits inside "Button/Primary" and the text is short.');
  });
  it.each(["btn", "primaryBtn", "hero-CTA", "cta_row", "Button 2"])(
    "matches %s as a whole word",
    (name) => {
      expect(out({ ...add, ...UNNAMED, ancestorNames: [name] })).toEqual(["button text", "N1"]);
    }
  );
  it.each(["buttons row", "ctaless", "tbtn2"])("does not match %s", (name) => {
    expect(
      decideRole({ ...add, ...UNNAMED, ancestorNames: [name], screenTextCensus: [] }).ruleId
    ).toBeNull();
  });
  it("allows 5 words and not 6", () => {
    expect(out({ ...add, wordCount: 5 })).toEqual(["button text", "N1"]);
    // At 6 words N1 steps aside and the own name "label" decides, N5 allows 6
    expect(out({ ...add, wordCount: 6 })).toEqual(["label", "N5"]);
    expect(out({ ...add, wordCount: 7, screenTextCensus: [] })).toEqual(["unsure", null]);
  });
  it("beats N5, so a button's label is button text and not a conflict", () => {
    expect(decideRole(add)).toMatchObject({ role: "button text", ruleId: "N1" });
  });
});

describe("N2, decorative from a name", () => {
  const mark = layer("A1.watermark");
  it("reads the own name", () => {
    expect(decideRole(mark).reason).toBe('Its layer name says it is decoration: "watermark".');
  });
  it("reads an ancestor's name, wherever it sits in the three", () => {
    const input = {
      ...mark,
      ...UNNAMED,
      ancestorNames: ["Frame 12", "Frame 3", "Background text"]
    };
    expect(decideRole(input).reason).toBe(
      'It sits inside "Background text", which says it is decoration.'
    );
  });
  it("is a conflict with any other name rule, the own name included", () => {
    expect(out({ ...mark, parentName: "caption" })).toEqual(["unsure", null]);
    expect(decideRole({ ...mark, layerName: "title watermark" })).toMatchObject({
      undecided: "conflict"
    });
    expect(decideRole({ ...mark, ancestorNames: ["button"] })).toMatchObject({
      undecided: "conflict"
    });
  });
});

describe("N3, N4 and N5 read the own name or the direct parent only", () => {
  const note = layer("A1.card1.caption");
  const heading = layer("A1.card1.name");
  const item = layer("A2.card.item1");
  it("reads the own name, then the parent's", () => {
    expect(decideRole(note).reason).toBe('Its layer name says it is a note: "caption".');
    const viaParent = {
      ...note,
      ...UNNAMED,
      parentName: "hint area",
      ancestorNames: ["hint area"]
    };
    expect(decideRole(viaParent).reason).toBe(
      'It sits directly inside "hint area", which says it is a note.'
    );
    expect(decideRole({ ...heading, ...UNNAMED, parentName: "Card title" }).reason).toBe(
      'It sits directly inside "Card title", which says it is a heading.'
    );
    expect(decideRole({ ...item, ...UNNAMED, parentName: "Quantity field" }).reason).toBe(
      'It sits directly inside "Quantity field", which says it is a label.'
    );
  });
  it("does not read a farther ancestor, a title block two levels up says nothing about this text", () => {
    const desc = layer("A1.card1.desc");
    const input = { ...desc, parentName: "card1", ancestorNames: ["card1", "title block", "A1"] };
    expect(out(input)).toEqual(["unsure", null]);
  });
  it("does not read the own name of a layer that renames itself", () => {
    const input = { ...layer("A1.title"), layerName: "Lakeside Café title", autoRename: true };
    expect(decideRole(input).ruleId).not.toBe("N4");
  });
  it("allows 12 words for a heading and not 13", () => {
    const title = layer("A1.title");
    expect(out({ ...title, wordCount: 12 })).toEqual(["heading", "N4"]);
    expect(decideRole({ ...title, wordCount: 13, screenTextCensus: [] }).ruleId).toBeNull();
  });
  it("allows 6 words for a label and not 7", () => {
    const named = { ...item, layerName: "Item label", parentName: "card" };
    expect(out({ ...named, wordCount: 6 })).toEqual(["label", "N5"]);
    expect(decideRole({ ...named, wordCount: 7, screenTextCensus: [] }).ruleId).toBeNull();
  });
  it("lets a caption name be any length", () => {
    expect(out({ ...note, wordCount: 40 })).toEqual(["caption", "N3"]);
  });
});

describe("ties between name rules", () => {
  const note = layer("A1.card1.caption");
  it.each([
    ["caption and heading", "caption title"],
    ["caption and label", "hint label"],
    ["heading and label", "heading field"],
    ["button and caption", "button hint"],
    ["button and heading", "button heading"]
  ])("%s on one name is a conflict", (_name, layerName) => {
    expect(decideRole({ ...note, layerName })).toMatchObject({
      role: "unsure",
      ruleId: null,
      undecided: "conflict"
    });
  });
  it("is a conflict when the own name and the parent point different ways", () => {
    expect(decideRole({ ...note, layerName: "caption", parentName: "page title" })).toMatchObject({
      undecided: "conflict"
    });
  });
  it("is not a conflict when two names point the same way", () => {
    expect(out({ ...note, layerName: "caption", parentName: "note caption" })).toEqual([
      "caption",
      "N3"
    ]);
  });
  it("says in plain words that the names disagree", () => {
    expect(decideRole({ ...note, layerName: "caption title" }).reason).toBe(
      "The names on this text point to different kinds of text."
    );
  });
});

describe("whole words only", () => {
  const base = layer("A1.card1.desc");
  it.each(["subtitle", "subheading text", "retitled", "headings", "fielding"])(
    "%s does not match a rule it contains",
    (name) => {
      const result = decideRole({ ...base, layerName: name, parentName: "card1", wordCount: 3 });
      expect(["N4", "N5"]).not.toContain(result.ruleId);
    }
  );
  it("splits a lower to upper case change, so cardTitle is a heading", () => {
    expect(out({ ...base, layerName: "cardTitle" })).toEqual(["heading", "N4"]);
  });
});
