import type { IssueState, Severity } from "../issues/issueTypes";
import { isFeedbackVisible } from "./studyBlockEvents";
import type {
  IssueActionEvent,
  IssueActionType,
  IssueFirstDetectedEvent,
  IssueFirstResponseEvent,
  IssueTarget,
  ReasonWrittenEvent,
  ResponseVia,
  StudyEventContext
} from "./studyEvents";

export const MAX_REASON_CHARS = 4000;

/** Null when this issue was already seen in the block */
export function buildIssueFirstDetected(
  ctx: StudyEventContext,
  at: string,
  issue: { id: string; severity: Severity },
  known: ReadonlySet<string>,
  startingIssue = false
): IssueFirstDetectedEvent | null {
  if (known.has(issue.id)) {
    return null;
  }
  return {
    type: "issue_first_detected",
    at,
    ctx,
    issueId: issue.id,
    severity: issue.severity,
    startingIssue
  };
}

export type ResponseTrigger =
  { kind: "action"; via: ResponseVia } | { kind: "selection"; origin: "participant" | "plugin" };

/**
 * Null unless a participant acted on an issue they could see, for the first time
 * A selection the plugin made never counts, and nothing counts while feedback is withheld
 */
export function buildIssueFirstResponse(
  ctx: StudyEventContext,
  at: string,
  issueId: string,
  trigger: ResponseTrigger,
  responded: ReadonlySet<string>
): IssueFirstResponseEvent | null {
  if (!isFeedbackVisible(ctx) || responded.has(issueId)) {
    return null;
  }
  if (trigger.kind === "selection" && trigger.origin === "plugin") {
    return null;
  }
  const via: ResponseVia = trigger.kind === "selection" ? "selected_on_canvas" : trigger.via;
  return { type: "issue_first_response", at, ctx, issueId, via };
}

export interface IssueActionInput {
  action: IssueActionType;
  target: IssueTarget;
  instanceCount: number;
  resultingState: IssueState;
  fromDecisionOffer?: boolean;
}

export function buildIssueAction(
  ctx: StudyEventContext,
  at: string,
  input: IssueActionInput
): IssueActionEvent {
  const event: IssueActionEvent = {
    type: "issue_action",
    at,
    ctx,
    action: input.action,
    target: input.target,
    instanceCount: input.instanceCount,
    resultingState: input.resultingState
  };
  return input.fromDecisionOffer === undefined
    ? event
    : { ...event, fromDecisionOffer: input.fromDecisionOffer };
}

/** The full text up to the cap, the untruncated reason is also in the issue and decision records */
export function buildReasonWritten(
  ctx: StudyEventContext,
  at: string,
  text: string,
  target: IssueTarget,
  source: ReasonWrittenEvent["source"]
): ReasonWrittenEvent {
  const truncated = text.length > MAX_REASON_CHARS;
  return {
    type: "reason_written",
    at,
    ctx,
    text: truncated ? text.slice(0, MAX_REASON_CHARS) : text,
    truncated,
    target,
    source
  };
}
