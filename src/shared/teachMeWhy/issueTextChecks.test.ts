import { describe, expect, it } from "vitest";
import { depth3Opening, issueTextProblems } from "./issueTextChecks";

const codes = (text: string) => issueTextProblems(text).map((problem) => problem.code);

describe("{fix} wording", () => {
  it("rejects {fix} used as a verb, from the preview", () => {
    expect(codes("The text falls short. You could {fix} to boost contrast.")).toEqual([
      "fix-wording"
    ]);
    expect(codes("You can {fix} now.")).toEqual(["fix-wording"]);
  });
  it("rejects {fix} that follows another placeholder, a clause end or the start", () => {
    expect(codes("It needs {required} {fix}")).toEqual(["fix-wording"]);
    expect(codes("Try this. {fix} works.")).toEqual(["fix-wording"]);
    expect(codes("{fix} works.")).toEqual(["fix-wording"]);
    expect(codes("Try by applying {fix}.")).toEqual(["fix-wording"]);
  });
  it("accepts {fix} directly after to, with or use", () => {
    expect(codes("Change the text to {fix}.")).toEqual([]);
    expect(codes("Swap it with {fix}.")).toEqual([]);
    expect(codes("You could use {fix} here.")).toEqual([]);
    expect(codes("Change it To {fix}.")).toEqual([]);
  });
});

describe("direction words near a colour", () => {
  it("rejects darken, darker and lighten near a colour slot, from the preview", () => {
    expect(codes("You could darken {background} a little.")).toEqual(["direction-word"]);
    expect(codes("Place it on a somewhat darker {background} surface.")).toEqual([
      "direction-word"
    ]);
    expect(codes("Lightening {foreground} would help.")).toEqual(["direction-word"]);
    expect(codes("Change the text to {fix}, a lighter colour.")).toEqual(["direction-word"]);
  });
  it("accepts the words when they are more than four words away", () => {
    expect(
      codes("You could put it on a darker surface, and then change the text to {fix}.")
    ).toEqual([]);
    expect(codes("You could darken the colour a little.")).toEqual([]);
  });
});

describe("size change as the fix", () => {
  it("rejects bigger or larger tied to the size slot or text size, from the preview", () => {
    expect(codes("Try a slightly bigger {fontsize} label.")).toEqual(["size-fix"]);
    expect(codes("You could increase the {fontsize} of the label.")).toEqual(["size-fix"]);
    expect(codes("Increase the font size or make the weight bolder.")).toEqual(["size-fix"]);
    expect(codes("You could make it bigger to help.")).toEqual(["size-fix"]);
    expect(codes("Bump up the text size a little.")).toEqual(["size-fix"]);
  });
  it("accepts the larger or bolder text route and size used as a plain fact", () => {
    expect(codes("You could keep the colour for larger or bolder text.")).toEqual([]);
    expect(codes("Because the {fontsize} heading has thick strokes, the bar is lower.")).toEqual(
      []
    );
  });
});

describe("depth 3 opening", () => {
  it("needs an issue detail in the first sentence", () => {
    expect(
      depth3Opening(
        "One creator described accessibility as a guard rail. Later {measured} appears."
      )
    ).toHaveLength(1);
    expect(
      depth3Opening("Even with {foreground} on {background}, there is room. Other words.")
    ).toEqual([]);
    expect(depth3Opening("At {fontsize} this text is small. Other words.")).toEqual([]);
    expect(depth3Opening("")).toHaveLength(1);
  });
});

describe("adverbs next to a slot", () => {
  it("rejects an -ly adverb directly before or after a ratio or colour slot, from the preview", () => {
    expect(codes("It is measured {measured} clearly versus required {required}.")).toEqual([
      "adverb"
    ]);
    expect(codes("Change the text to {fix} to easily meet the minimum.")).toEqual(["adverb"]);
    expect(codes("It is a clearly weak {foreground} here.")).toEqual(["adverb"]);
  });
  it("leaves only, and adverbs far from a slot, alone", () => {
    expect(codes("The text is only {measured} against {required}.")).toEqual([]);
    expect(codes("You could easily pick a new shade, and then change the text to {fix}.")).toEqual(
      []
    );
  });
});

describe("weight change as the fix", () => {
  it("rejects font weight and bolder as the fix, from the preview", () => {
    expect(codes("You could increase the font weight slightly.")).toEqual(["size-fix"]);
    expect(codes("Another option is a bolder weight.")).toEqual(["size-fix"]);
    expect(codes("You could make it bolder.")).toEqual(["size-fix"]);
  });
  it("still allows larger or bolder text as a route for large text", () => {
    expect(codes("You could keep the colour for larger or bolder text.")).toEqual([]);
  });
});
