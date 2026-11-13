/**
 * Numbers drawn as strokes, so a marker can carry a count without a text layer
 * A text layer would be read by every scan of the file's text and would need a font, a stroke path does neither
 * Each glyph is a few polylines on a grid 4 wide and 6 high
 */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  "0": ["M1 0 L3 0 L4 1 L4 5 L3 6 L1 6 L0 5 L0 1 Z"],
  "1": ["M1 1.2 L2 0 L2 6"],
  "2": ["M0 1 L1 0 L3 0 L4 1 L4 2 L0 6 L4 6"],
  "3": ["M0 0 L4 0 L2 2.5 L3 2.5 L4 3.5 L4 5 L3 6 L1 6 L0 5"],
  "4": ["M3 0 L0 4 L4 4", "M3 1.5 L3 6"],
  "5": ["M4 0 L0 0 L0 3 L3 3 L4 4 L4 5 L3 6 L0 6"],
  "6": ["M3.5 0 L1 0 L0 1 L0 5 L1 6 L3 6 L4 5 L4 4 L3 3 L0 3"],
  "7": ["M0 0 L4 0 L1.5 6"],
  "8": ["M1 0 L3 0 L4 1 L4 2 L3 3 L1 3 L0 2 L0 1 Z", "M1 3 L0 4 L0 5 L1 6 L3 6 L4 5 L4 4 L3 3"],
  "9": ["M0.5 6 L3 6 L4 5 L4 1 L3 0 L1 0 L0 1 L0 2 L1 3 L4 3"],
  "+": ["M0 3 L4 3", "M2 1 L2 5"]
};

export const GLYPH_WIDTH = 4;
export const GLYPH_HEIGHT = 6;
const GLYPH_GAP = 1.5;

/** The most a marker counts to, a larger group is shown as 99+ */
export const MAX_COUNT = 99;

/** What is written on a marker for a count, nothing for a layer that has no related ones */
export function countText(count: number | undefined): string | null {
  if (count === undefined || count < 2) return null;
  return count > MAX_COUNT ? `${MAX_COUNT}+` : String(Math.floor(count));
}

/** How big one glyph unit is on the marker, fewer characters get bigger glyphs so they stay readable */
export function glyphScale(characters: number): number {
  if (characters <= 1) return 0.8;
  return characters === 2 ? 0.8 : 0.5;
}

export interface DigitPath {
  /** SVG path data in canvas units, starting at the origin of the number */
  data: string;
  width: number;
  height: number;
  strokeWeight: number;
}

const shift = (path: string, dx: number): string =>
  path.replace(
    /([ML])\s*(-?[\d.]+)\s+(-?[\d.]+)/g,
    (_all, op, x, y) => `${op}${Number(x) + dx} ${y}`
  );

const scaled = (path: string, factor: number): string =>
  path.replace(
    /([ML])\s*(-?[\d.]+)\s+(-?[\d.]+)/g,
    (_all, op, x, y) => `${op}${Number(x) * factor} ${Number(y) * factor}`
  );

/** The path of a count text at one scale, glyph units times the scale, left to right with a gap between glyphs */
export function digitPath(text: string, scale: number): DigitPath {
  const parts: string[] = [];
  let at = 0;
  for (const character of text) {
    for (const polyline of GLYPHS[character] ?? []) {
      parts.push(scaled(shift(polyline, at), scale));
    }
    at += GLYPH_WIDTH + GLYPH_GAP;
  }
  const characters = [...text].length;
  const widthUnits = characters * GLYPH_WIDTH + (characters - 1) * GLYPH_GAP;
  return {
    data: parts.join(" "),
    width: widthUnits * scale,
    height: GLYPH_HEIGHT * scale,
    strokeWeight: characters >= 3 ? 0.6 : 0.8
  };
}
