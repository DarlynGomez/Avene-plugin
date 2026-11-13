/** How far a finding falls short of its required contrast, banded for display and fading */
export type Severity = "low" | "medium" | "high";

/** Colour with each channel from 0 to 1 like Figma */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/** The layer that supplied a resolved background, a named node or the page as the fallback */
export type BackgroundSource =
  { kind: "node"; nodeId: string; nodeName: string } | { kind: "page" };

/** A node reduced to what rules need, null means unresolved so rules must not guess */
export interface NodeSnapshot {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  /** Screen identity, never null, kept on the snapshot because every rule needs it */
  screenId: string;
  screenName: string;
  /** Variable or style name, null when unbound */
  foregroundBinding: string | null;
  foreground: RGBColor | null;
  foregroundAlpha: number | null;
  background: RGBColor | null;
  backgroundAlpha: number | null;
  backgroundSource: BackgroundSource | null;
  fontSizePx: number | null;
  isBold: boolean | null;
  /** The exact Figma font style string, when the font name resolved, evidence only */
  fontStyleName: string | null;
  indeterminateReasons: readonly string[];
}

/** One rule verdict on one node, evidence holds whatever the rule needs to show it */
export interface Finding<TEvidence = unknown> {
  ruleId: string;
  nodeId: string;
  severity: Severity;
  evidence: TEvidence;
}

/** Four states are set by the designer, resolved comes from detection */
export type IssueState = "open" | "deferred" | "ignored" | "important" | "resolved";

/** Stored record for one rule on one node, the re-encounter guard is runtime only on purpose */
export interface Issue {
  id: string;
  ruleId: string;
  nodeId: string;
  state: IssueState;
  severityAtLastDetection: Severity;
  encounterCount: number;
  lastDetectedAt: string;
  ignoredReason?: string;
  ignoredAt?: string;
  /** When it was put off, set by defer and gone again once it leaves the deferred state */
  deferredAt?: string;
  severityAtIgnore?: Severity;
  /** Set when a worse finding reopened this ignored issue */
  changedSinceIgnore?: boolean;
}

/** Panel data beyond the stored record, recomputed live so it is never stale */
export interface IssueSummary extends Issue {
  nodeName: string;
  /** Undefined only when the node itself could not be found, the same case evidence handles */
  screenId?: string;
  screenName?: string;
  evidence?: unknown;
}
