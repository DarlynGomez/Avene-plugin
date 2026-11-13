import type { Audience } from "./types";

/** Every status a row can have, and which of them still need someone to act */
export type StatusKind = "open" | "needsCheck" | "adjusted" | "ignored" | "decided";

export interface TableStatus {
  kind: StatusKind;
  /** The word that is printed, the meaning is in the word and never in a color or a shape */
  text: string;
  /** Open and Needs check, the two that someone still has to deal with */
  needsAction: boolean;
}

export interface TableNote {
  text: string;
  /** Quiet lines are small and gray, a normal one reads like the detail */
  tone: "normal" | "quiet";
}

export interface TableRow {
  /** The root signature, or the layer id for an alt row */
  id: string;
  element: string;
  /** The screen the layer is on, empty when it is not known */
  location: string;
  /** Short facts printed after the location, such as 3 layers or large text */
  details: readonly string[];
  /** The measurement of a contrast row, null for an alt row */
  contrast: { measured: string; required: string | null } | null;
  status: TableStatus;
  /** The line across the whole row, muted when it only says nothing is recorded yet, null when there is nothing to say */
  detail: { text: string; muted: boolean } | null;
  /** Further lines under the detail, in the order they print */
  notes: readonly TableNote[];
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
  /** The file name, the title of the document */
  title: string;
  /** Accessibility handoff, the date and the screens that have rows */
  subtitle: string;
  date: string;
  screens: readonly string[];
  buildId: string | null;
  /** Deferred layers are not rows, they are only counted so the header does not hide them */
  counts: {
    rows: number;
    groups: number;
    needAction: number;
    decided: number;
    deferred: number;
  };
}

export interface TableFooter {
  /** The fixed Not covered line without its label, otherwise as it is written */
  notCovered: string;
  /** What the check can and cannot see, kept for the exports and not printed on the screen */
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
