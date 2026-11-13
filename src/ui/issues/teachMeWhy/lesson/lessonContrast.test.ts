import { describe, expect, it } from "vitest";

import { contrastRatio } from "../../../../shared/colour/contrastRatio";
import { parseHex } from "../../../../shared/colour/hexInput";
import { TOKEN_VALUES } from "../../../theme/tokens";

const hex = (token: keyof typeof TOKEN_VALUES) => {
  const rgb = parseHex(TOKEN_VALUES[token]);
  if (!rgb) throw new Error(`${token} is not a color`);
  return rgb;
};

/** Every text color on the lesson page and the surface it sits on */
const PAIRS: [string, keyof typeof TOKEN_VALUES, keyof typeof TOKEN_VALUES][] = [
  ["ink on paper", "--color-lesson-ink", "--color-lesson-paper"],
  ["secondary on paper", "--color-lesson-secondary", "--color-lesson-paper"],
  ["muted on paper", "--color-lesson-muted", "--color-lesson-paper"],
  ["muted on white", "--color-lesson-muted", "--color-card"],
  ["accent on white", "--color-lesson-accent", "--color-card"],
  ["accent on paper", "--color-lesson-accent", "--color-lesson-paper"],
  ["ink on white", "--color-lesson-ink", "--color-card"],
  ["paper on ink", "--color-lesson-paper", "--color-lesson-ink"],
  ["on-dark accent on ink", "--color-lesson-on-dark-accent", "--color-lesson-ink"],
  ["on-dark secondary on ink", "--color-lesson-on-dark-secondary", "--color-lesson-ink"],
  ["white on the duration chip", "--color-card", "--color-lesson-chip"],
  ["secondary on the count pill", "--color-lesson-secondary", "--color-lesson-pill"]
];

describe("the lesson page colors", () => {
  it.each(PAIRS)("%s reaches 4.5 to 1", (_name, text, surface) => {
    expect(contrastRatio(hex(text), hex(surface))).toBeGreaterThanOrEqual(4.5);
  });
});
