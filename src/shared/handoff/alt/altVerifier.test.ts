import { describe, expect, it } from "vitest";

import { ALT_MAX_CHARS } from "./altLimits";
import { RULE_SEVERITY, type AltRuleId } from "./altRuleTables";
import { verifyAltSuggestion } from "./altVerifier";

const LONG = "a".repeat(ALT_MAX_CHARS + 1);

describe("verifyAltSuggestion", () => {
  it.each<[string, string, string | undefined, AltRuleId[], boolean]>([
    ["a plain description", "Order summary icon that opens the cart", undefined, [], true],
    ["a description of exactly the limit", "a".repeat(ALT_MAX_CHARS), undefined, [], true],
    ["text read from an image, kept exactly", "Save 20% today", undefined, [], true],
    ["nothing", "", undefined, ["empty"], false],
    ["only spaces", "   ", undefined, ["empty"], false],
    ["one over the limit", LONG, undefined, ["too-long"], true],
    ["a line break", "A sign\nover the door", undefined, ["line-break"], false],
    ["a carriage return", "A sign\rover the door", undefined, ["line-break"], false],
    ["bold", "A **sale** sign", undefined, ["markdown"], false],
    ["code", "The `Buy` button", undefined, ["markdown"], false],
    ["a heading", "# Welcome back", undefined, ["markdown"], false],
    ["a list item", "- First step", undefined, ["markdown"], false],
    ["a numbered item", "1. First step", undefined, ["markdown"], false],
    [
      "a link in markdown",
      "See [the docs](https://x.test)",
      undefined,
      ["markdown", "link"],
      false
    ],
    ["a web address", "Visit https://example.com for more", undefined, ["link"], false],
    ["a www address", "Go to www.example.org", undefined, ["link"], false],
    ["a bare domain", "From acme.com", undefined, ["link"], false],
    ["an email", "Write to sam@acme.org", undefined, ["link"], false],
    ["image of", "Image of a cafe table", undefined, ["banned-prefix"], false],
    ["picture of", "Picture of a cafe table", undefined, ["banned-prefix"], false],
    ["photo of", "photo of a cafe table", undefined, ["banned-prefix"], false],
    ["graphic of", "Graphic of a chart", undefined, ["banned-prefix"], false],
    ["icon of", "Icon of a cart", undefined, ["banned-prefix"], false],
    ["a prefix after a quote", "“Image of a table", undefined, ["banned-prefix"], false],
    ["a word that only starts like a prefix", "Imagery of a table", undefined, [], true],
    [
      "starting with a file-like layer name",
      "hero.png shows a cafe table",
      "hero.png",
      ["file-name"],
      false
    ],
    [
      "starting with the name without its extension",
      "hero shows a cafe table",
      "hero.png",
      ["file-name"],
      false
    ],
    ["starting with a camera name", "IMG_2043 on a table", "IMG_2043", ["file-name"], false],
    ["a layer name that is not a file name", "Hero shows a cafe table", "Hero", [], true],
    ["a file-like name that is not at the start", "A cafe table, hero.png", "hero.png", [], true],
    ["only the word image", "Image", undefined, ["only-image"], false],
    ["only the word image with a full stop", "image.", undefined, ["only-image"], false],
    ["only the word photo", "Photo", undefined, ["only-image"], false]
  ])("%s", (_name, text, layer, expected, ok) => {
    const verdict = verifyAltSuggestion(text, layer);
    expect([...verdict.failures].sort()).toEqual([...expected].sort());
    expect(verdict.ok).toBe(ok);
  });

  it("skips the layer name rule when it has no layer name", () => {
    expect(verifyAltSuggestion("hero.png shows a table").failures).toEqual([]);
  });

  it("says which rules reject and which only warn, and every rule has a severity", () => {
    expect(RULE_SEVERITY["too-long"]).toBe("warn");
    for (const id of [
      "empty",
      "line-break",
      "markdown",
      "link",
      "banned-prefix",
      "file-name",
      "only-image"
    ] as const) {
      expect(RULE_SEVERITY[id]).toBe("reject");
    }
  });

  it("counts characters and not code units, so a long word with accents is not over early", () => {
    expect(verifyAltSuggestion("é".repeat(ALT_MAX_CHARS)).failures).toEqual([]);
    expect(verifyAltSuggestion("\u{1F600}".repeat(ALT_MAX_CHARS)).failures).toEqual([]);
  });
});
