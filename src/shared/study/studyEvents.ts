import type { IssueState, Severity } from "../issues/issueTypes";
import type {
  DepthChangedEvent,
  ExplanationDismissedEvent,
  ExplanationOpenedEvent
} from "./explanationStudyEvents";
import type { MarkerStyle } from "../markers/markerStyle";
import type { BlockNumber, StudyCondition, StudyPhase, TaskId } from "./studyTypes";

/** Who and where an event happened, copied from the session so each event stands alone */
export interface StudyEventContext {
  participantId: string;
  block: BlockNumber;
  task: TaskId;
  condition: StudyCondition;
  phase: StudyPhase;
}

/** A single issue, or a whole root named by its colour signature */
export type IssueTarget = { kind: "issue"; issueId: string } | { kind: "root"; signature: string };

export type IssueActionType =
  | "defer"
  | "pin"
  | "unpin"
  | "ignore"
  | "reopen"
  | "restore_deferred"
  | "show_on_canvas"
  | "locate";

/** What the participant did that counts as a first response */
export type ResponseVia = IssueActionType | "adjust" | "selected_on_canvas";

export interface SnapshotRow {
  id: string;
  state: IssueState;
  severity: Severity;
}

interface Base {
  /** ISO time the event happened */
  at: string;
  ctx: StudyEventContext;
}

export interface BlockStartedEvent extends Base {
  type: "block_started";
  studyProfileVersion: number;
}

export interface FeedbackRevealedEvent extends Base {
  type: "feedback_revealed";
}

/** The final snapshot, split into parts so one event never outgrows a chunk */
export interface BlockEndedEvent extends Base {
  type: "block_ended";
  part: { index: number; of: number };
  issues: readonly SnapshotRow[];
}

export interface IssueFirstDetectedEvent extends Base {
  type: "issue_first_detected";
  issueId: string;
  severity: Severity;
  /** True when the issue was already in the file when the block started */
  startingIssue: boolean;
}

export interface IssueFirstResponseEvent extends Base {
  type: "issue_first_response";
  issueId: string;
  via: ResponseVia;
}

export interface IssueActionEvent extends Base {
  type: "issue_action";
  action: IssueActionType;
  target: IssueTarget;
  instanceCount: number;
  resultingState: IssueState;
  /** Set on an ignore that accepted a recorded decision offer */
  fromDecisionOffer?: boolean;
}

export interface ReasonWrittenEvent extends Base {
  type: "reason_written";
  text: string;
  truncated: boolean;
  target: IssueTarget;
  source: "ignore_sheet" | "decision_offer";
}

/** Points at the existing Adjust log entry, which stays the only record of the adjustment */
export interface AdjustEventEvent extends Base {
  type: "adjust_event";
  adjustLogIndex: number;
  issueId: string;
  loggedAt: string;
}

/** Shown or hidden, or the current screen changed while on, never which screen it was */
export type MarkerStateChange = "shown" | "hidden" | "screen_changed";

export interface MarkerStateEvent extends Base {
  type: "marker_state";
  markersOn: boolean;
  change: MarkerStateChange;
  markerCount: number;
  /** Which look was on the canvas, so the comparison can be told apart in the data */
  style: MarkerStyle;
}

export interface RoleAnsweredEvent extends Base {
  type: "role_answered";
  nodeId: string;
  role: string;
  /** What produced the label that was shown: a rule, a reviewed precomputed suggestion, a live one, or none */
  source?: "rule" | "ai_precomputed" | "ai_live" | "none";
  /** The label that was shown to the participant, never the layer's words */
  suggested?: string | null;
  response?: "confirmed" | "changed" | "unsure";
  ruleId?: string;
  /** The model that made a suggestion, as the service reports it */
  model?: string;
}

export type StudyEvent =
  | BlockStartedEvent
  | FeedbackRevealedEvent
  | BlockEndedEvent
  | IssueFirstDetectedEvent
  | IssueFirstResponseEvent
  | IssueActionEvent
  | ReasonWrittenEvent
  | AdjustEventEvent
  | MarkerStateEvent
  | ExplanationOpenedEvent
  | DepthChangedEvent
  | ExplanationDismissedEvent
  | RoleAnsweredEvent;

export type {
  DepthChangedEvent,
  ExplanationDismissedEvent,
  ExplanationOpenedEvent
} from "./explanationStudyEvents";

export type StudyEventType = StudyEvent["type"];
