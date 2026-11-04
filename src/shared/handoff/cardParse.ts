import type { Owner } from "./types";

export interface CardLine {
  /** As shown, the canonical word for developers and the plain word for everyone else */
  label: string;
  owner?: Owner;
  text: string;
  link?: string;
}

const LINE =
  /^(Detected|Decision|Needs check|Measured|Decided|Still to check)(?: \(owner: (Dev|PM|Design)\))?: ([\s\S]*)$/;
const LINK = /\s*Link: (\S+)\s*$/;

/** A line of a document split into its label, text and trailing link; null when it has no label */
export function parseCardLine(line: string): CardLine | null {
  const match = LINE.exec(line);
  if (!match) return null;
  const link = LINK.exec(match[3]);
  return {
    label: match[1],
    ...(match[2] ? { owner: match[2] as Owner } : {}),
    text: link ? match[3].replace(LINK, "") : match[3],
    ...(link ? { link: link[1] } : {})
  };
}

export interface CardHead {
  /** The layer name, absent in versions that leave names out */
  name?: string;
  screen: string;
  rest: string;
}

/** The start of an item line: the layer and screen it is about, and what is said of it */
export function splitHead(text: string): CardHead | null {
  const named = /^"(.+?)" on (.+?): ([\s\S]*)$/.exec(text);
  if (named) return { name: named[1], screen: named[2], rest: named[3] };
  const plain = /^Text on (.+?): ([\s\S]*)$/.exec(text);
  return plain ? { screen: plain[1], rest: plain[2] } : null;
}

export interface Measure {
  foreground?: string;
  background?: string;
  measured: string;
  needs: string;
  criterion: string;
  /** What the line says after the numbers, such as how many layers share the pair */
  extra: string;
}

const MEASURE =
  /^(?:text (#[0-9A-Fa-f]{6}) on (#[0-9A-Fa-f]{6}), )?measured ([\d.]+):1, needs ([\d.]+):1 \(([^)]+)\)[.,]?\s*([\s\S]*)$/;

/** The numbers of an item line, so a card can show them short; null when the line is not one */
export function splitMeasure(rest: string): Measure | null {
  const m = MEASURE.exec(rest);
  if (!m) return null;
  return {
    ...(m[1] && m[2] ? { foreground: m[1], background: m[2] } : {}),
    measured: m[3],
    needs: m[4],
    criterion: m[5],
    extra: m[6].trim()
  };
}

const FIX = /would reach it: (#[0-9A-Fa-f]{6}), measuring ([\d.]+):1/;

/** The color and its ratio from a suggested color line, null when the line is something else */
export function splitFix(text: string): { hex: string; ratio: string } | null {
  const m = FIX.exec(text);
  return m ? { hex: m[1], ratio: m[2] } : null;
}
