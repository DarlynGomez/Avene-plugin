import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { contrastRatio } from "../../../shared/colour/contrastRatio";
import { parseHex } from "../../../shared/colour/hexInput";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (file: string) => readFileSync(path.join(HERE, file), "utf8");
const tokens = Object.fromEntries(
  [...read("../../theme/global.css").matchAll(/(--color-[\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})/g)].map(
    ([, name, value]) => [name, value]
  )
);

/** The colour a rule sets for a selector, read from the css module as written */
function colourOf(css: string, selector: string): string {
  for (const [, names, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!names.split(",").some((name) => name.trim() === selector)) continue;
    const match = body.match(/(?:^|[\s;])color:\s*var\((--color-[\w-]+)\)/);
    if (match) return match[1];
  }
  throw new Error(`no colour for ${selector}`);
}

function ratio(foreground: string, background: string): number {
  const fg = parseHex(tokens[foreground]);
  const bg = parseHex(tokens[background]);
  if (!fg || !bg) throw new Error(`unknown token ${foreground} or ${background}`);
  return contrastRatio(fg, bg);
}

// Secondary text, each on the surface it sits on
const SECONDARY: [string, string, string, string][] = [
  ["unselected depth label", "DepthGroup.module.css", ".label", "--color-background"],
  ["depth group legend", "DepthGroup.module.css", ".legend", "--color-card"],
  ["AI label and Based on", "ExplanationCard.module.css", ".note", "--color-card"],
  ["hidden line", "ExplanationCard.module.css", ".quiet", "--color-card"],
  ["Hide this explanation", "ExplanationCard.module.css", ".action", "--color-card"],
  ["context line detail", "ExplanationContextLine.module.css", ".detail", "--color-card"],
  [
    "popover ratio label",
    "../components/WhySurfacedPopover.module.css",
    ".ratioLabel",
    "--color-card"
  ],
  ["empty state", "TeachMeWhyTab.module.css", ".emptyText", "--color-background"]
];

describe("secondary text in the explanation card", () => {
  it.each(SECONDARY)("%s reaches 4.5:1 against its background", (_name, file, selector, bg) => {
    const foreground = colourOf(read(file), selector);
    expect(ratio(foreground, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("holds for the selected label and the Why this matters button", () => {
    expect(ratio("--color-ink", "--color-card")).toBeGreaterThanOrEqual(4.5);
    expect(
      ratio(colourOf(read("../components/WhySurfacedPopover.module.css"), ".why"), "--color-accent")
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the context line in view while the explanation scrolls", () => {
    expect(read("ExplanationContextLine.module.css")).toMatch(/position:\s*sticky/);
  });
});
