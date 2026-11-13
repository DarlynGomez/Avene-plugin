import { CONTENT_WIDTH, PAGE } from "./pdfDraw";

/** Sizes in points: cell padding, the width of the fitted columns, two text sizes, and the gap between lines */
export const PAD = 6;
export const FIT = 84;
export const BODY = 10;
export const SMALL = 9;
export const GAP = 2;
/** The line that holds a link under a row's location */
export const LINK_HEIGHT = 13;

export interface Columns {
  contrast: boolean;
  /** Left edge and width of each column, the first one takes what is left */
  x: number[];
  w: number[];
}

export function columnsFor(contrast: boolean): Columns {
  const first = CONTENT_WIDTH - FIT * (contrast ? 2 : 1);
  const w = contrast ? [first, FIT, FIT] : [first, FIT];
  const x = w.map((_, i) => PAGE.margin + w.slice(0, i).reduce((a, b) => a + b, 0));
  return { contrast, x, w };
}

/** The width a cell's text has, inside its padding */
export const innerWidth = (cols: Columns, i: number): number => cols.w[i] - 2 * PAD;
