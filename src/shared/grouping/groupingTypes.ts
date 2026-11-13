import type { IssueState, Severity } from "../issues/issueTypes";

/** Plain data grouping needs from one issue */
export interface GroupableFinding {
  issueId: string;
  nodeId: string;
  nodeName: string;
  /** Identity for grouping, screen names can repeat */
  screenId: string;
  /** For display only, never used to group */
  screenName: string;
  state: IssueState;
  severity: Severity;
  /** When the issue was deferred, absent for an issue deferred before the time was kept */
  deferredAt?: string;
  measuredRatio: number;
  requiredRatio: number;
  foregroundHex: string;
  backgroundHex: string;
  /** null means unbound, part of the signature */
  foregroundBinding: string | null;
  /** null means unbound, not part of the signature */
  backgroundBinding: string | null;
  /** Order the snapshot adapter emitted this instance in */
  documentOrder: number;
}

/** The four states a root can show, decided means moved to the decisions view */
export type RootDisplayState = "important" | "open" | "deferred" | "decided";

/** Count of instances in each real state, for mixed roots */
export type RootStateBreakdown = Readonly<Partial<Record<IssueState, number>>>;

/** A root is computed from its instances and never persisted */
export interface Root {
  signature: string;
  foregroundHex: string;
  backgroundHex: string;
  foregroundBinding: string | null;
  requiredRatio: number;
  instances: readonly GroupableFinding[];
  /** Issue id of the representative instance */
  representativeIssueId: string;
  /** Distinct background bindings across the instances */
  backgroundBindings: readonly string[];
  displayState: RootDisplayState;
  stateBreakdown: RootStateBreakdown;
}

/** A stored decision, one per root signature */
export interface RootDecision {
  signature: string;
  reason: string;
  recordedAt: string;
  severityAtDecision: Severity;
}

export type DecisionMatch =
  | { offered: true; decision: RootDecision }
  | { offered: false; decision: RootDecision; reason: "worse-severity" }
  | { offered: false; decision: null; reason: "no-match" };
