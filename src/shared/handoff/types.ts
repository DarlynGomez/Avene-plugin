import type { GroupableFinding, RootDecision } from "../grouping/groupingTypes";
import type { Severity } from "../issues/issueTypes";
import type { NodeNote } from "./noteStorage";

export type Label = "Detected" | "Decision" | "Needs check";
export type Audience = "developer" | "pm" | "higherUp" | "client";
export type Owner = "Dev" | "PM" | "Design";

/** One member today, a second one needs a producer and a decision first */
export type Condition = "standard";

/** A finding plus the two things handoff needs that grouping does not carry */
export interface HandoffFinding extends GroupableFinding {
  changedSinceIgnore?: boolean;
  /** Built by the caller from the pasted file address, absent means no link line */
  link?: string;
}

/** The designer's handoff fields for one root, every one optional */
export interface HandoffItemMeta {
  revisitTrigger?: string;
  mitigation?: string;
  decidedBy?: string;
  signOff: "needs" | "signed";
  signedBy?: string;
  signedAt?: string;
  leaveOut: boolean;
}

export interface HandoffQuestion {
  text: string;
  owner: Owner;
  link?: string;
}

/** An applied adjustment, already joined to a live issue by the caller */
export interface HandoffChange {
  nodeName: string;
  beforeHex: string;
  beforeRatio: number;
  afterHex: string;
  afterRatio: number;
  instanceCount: number;
}

/** A designer note on one layer, the layer name comes from the file as it is now */
export interface HandoffNote {
  nodeName: string;
  link?: string;
  note: NodeNote;
}

export interface HandoffScreen {
  id: string;
  name: string;
}

export interface HandoffInput {
  fileName: string;
  /** The address the designer pasted once, absent means no links */
  fileUrl?: string;
  generatedAt: string;
  /** The chosen screens, in the order they print */
  screens: readonly HandoffScreen[];
  findings: readonly HandoffFinding[];
  decisions: Readonly<Record<string, RootDecision>>;
  /** Keyed by root signature */
  meta: Readonly<Record<string, HandoffItemMeta>>;
  changes: readonly HandoffChange[];
  questions: readonly HandoffQuestion[];
  /** Notes that are not questions, which print under Designer notes */
  notes?: readonly HandoffNote[];
  reviewer?: { name: string; date: string };
}

/** One root restricted to one screen */
export interface HandoffItem {
  kind: "action" | "left";
  signature: string;
  screenId: string;
  screenName: string;
  condition: Condition;
  important: boolean;
  instances: readonly HandoffFinding[];
  representative: HandoffFinding;
  highestSeverity: Severity;
  decision: RootDecision | null;
  meta: HandoffItemMeta;
}

/** The lines of one item, and the layers it is about so a panel can select them */
export interface ItemGroup {
  lines: readonly string[];
  nodeIds: readonly string[];
}

/** Section lines are logical lines in slot form, each starting with a label */
export interface DocSection {
  id: string;
  title: string;
  lines: readonly string[];
  /** The same lines grouped by item, for a card view; absent for sections of single lines */
  groups?: readonly ItemGroup[];
}

/** What a version may show, developers see everything, clients see the least */
export interface LineOptions {
  hex: boolean;
  names: boolean;
  status: boolean;
}

export interface HandoffDoc {
  /** Short hash of the values, the same in every version */
  hash: string;
  /** Hash of the lines and values of this version, the key for a cached draft */
  structureHash: string;
  /** Metadata lines, exempt from the label rule */
  header: readonly string[];
  sections: readonly DocSection[];
  slots: Readonly<Record<string, string>>;
}

/** A version for one reader, notices are fixed lines exempt from the label rule like the header */
export interface AudienceDoc extends HandoffDoc {
  audience: Audience;
  notices: readonly string[];
  /** Designer text in this version that holds a hex value or a digit run, never altered */
  warnings: readonly DesignerTextHit[];
}

export interface DesignerTextHit {
  /** The root signature, or question and its position */
  item: string;
  field: string;
  kind: "hex" | "digits";
  match: string;
}
