import type { Audience, Label } from "./types";

/** A shape beside the status words, so the status never rests on color alone */
export type StatusShape = "triangle" | "square" | "diamond";

export interface TableStatus {
  label: Label;
  /** What is printed, the label itself for a developer and the plain word for everyone else */
  text: string;
  shape: StatusShape;
}

export interface TableRow {
  /** The root signature, or the layer id for an alt row */
  id: string;
  element: string;
  location: string;
  /** Printed as 3.45:1, null for a row that is not a contrast measurement */
  measured: string | null;
  required: string | null;
  status: TableStatus;
  /** Empty when nothing is recorded */
  decision: string;
  decidedBy: string;
  note: string;
  /** The layers the row is about, so a panel can select them */
  nodeIds: readonly string[];
}

export type GroupId = "contrast" | "alt";

export interface TableGroup {
  id: GroupId;
  title: string;
  rows: readonly TableRow[];
}

export interface TableHeader {
  fileName: string;
  screens: readonly string[];
  /** The day it was made, as YYYY-MM-DD */
  date: string;
  buildId: string | null;
  counts: { rows: number; groups: number; detected: number; decision: number; needsCheck: number };
}

export interface TableFooter {
  /** The fixed Not covered line, never edited */
  notCovered: string;
  /** What the check can and cannot see, said once for the whole table */
  limitation: string;
}

/** What every version of the handoff table reads, the screen, the copied text and any document made from it */
export interface HandoffTableModel {
  audience: Audience;
  header: TableHeader;
  groups: readonly TableGroup[];
  footer: TableFooter;
  /** A sentence for a table with no rows, null when there are rows */
  empty: string | null;
}

export const EMPTY_TABLE_SENTENCE = "No findings to hand off yet.";
