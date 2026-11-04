import { describe, expect, it } from "vitest";

import { parseCardLine, splitFix, splitHead, splitMeasure } from "./cardParse";

describe("parseCardLine", () => {
  it("splits label, owner, text and a trailing link", () => {
    expect(
      parseCardLine(
        "Needs check (owner: PM): Does it? Link: https://www.figma.com/design/K/F?node-id=1-2"
      )
    ).toEqual({
      label: "Needs check",
      owner: "PM",
      text: "Does it?",
      link: "https://www.figma.com/design/K/F?node-id=1-2"
    });
  });

  it("reads plain-word labels and lines with no link", () => {
    expect(parseCardLine("Still to check: Status: Needs sign-off.")).toEqual({
      label: "Still to check",
      text: "Status: Needs sign-off."
    });
  });

  it("gives null for a line with no label", () => {
    expect(parseCardLine("Just words")).toBeNull();
    expect(parseCardLine("detected: lower case")).toBeNull();
  });
});

describe("splitHead", () => {
  it("reads the layer and screen, or only the screen when names are left out", () => {
    expect(splitHead('"Price label" on Payment: text #777777 on #FFFFFF')).toEqual({
      name: "Price label",
      screen: "Payment",
      rest: "text #777777 on #FFFFFF"
    });
    expect(splitHead("Text on Cart: measured 3.4:1")).toEqual({
      screen: "Cart",
      rest: "measured 3.4:1"
    });
    expect(splitHead("4 items need action")).toBeNull();
  });
});

describe("splitMeasure", () => {
  it("reads the colors, the ratios, the criterion and what follows", () => {
    expect(
      splitMeasure(
        "text #9A9A9A on #FFFFFF, measured 2.81:1, needs 4.5:1 (WCAG 1.4.3). 2 layers share it."
      )
    ).toEqual({
      foreground: "#9A9A9A",
      background: "#FFFFFF",
      measured: "2.81",
      needs: "4.5",
      criterion: "WCAG 1.4.3",
      extra: "2 layers share it."
    });
  });

  it("reads a line with no colors, and gives null for anything else", () => {
    expect(splitMeasure("measured 2.6:1, needs 4.5:1 (WCAG 1.4.3), 1 layer.")).toEqual({
      measured: "2.6",
      needs: "4.5",
      criterion: "WCAG 1.4.3",
      extra: "1 layer."
    });
    expect(splitMeasure("Brand color")).toBeNull();
  });
});

describe("splitFix", () => {
  it("reads the suggested color and its ratio", () => {
    expect(
      splitFix("A color on the same hue that would reach it: #747474, measuring 4.65:1.")
    ).toEqual({
      hex: "#747474",
      ratio: "4.65"
    });
    expect(splitFix("Brand color")).toBeNull();
  });
});
