import {
  buildIssueAction,
  buildIssueFirstResponse,
  buildReasonWritten
} from "../../shared/study/studyEventBuilders";
import type {
  IssueActionType,
  IssueTarget,
  ReasonWrittenEvent,
  StudyEvent
} from "../../shared/study/studyEvents";
import type { IssueState } from "../../shared/issues/issueTypes";
import { emitStudy } from "./adapter/studyEmitter";

export interface IssueActionEmission {
  action: IssueActionType;
  target: IssueTarget;
  /** Every issue the action touched, each gets a first response the first time it is acted on */
  issueIds: readonly string[];
  instanceCount: number;
  resultingState: IssueState;
  fromDecisionOffer?: boolean;
  reason?: { text: string; source: ReasonWrittenEvent["source"] };
}

/**
 * First responses, then the action, then the reason, in that order
 * A participant click is a response, the selection the plugin makes afterwards is not recorded at all
 */
export function emitIssueAction(input: IssueActionEmission, at = new Date().toISOString()): void {
  emitStudy((ctx, seen) => {
    const events: StudyEvent[] = input.issueIds.flatMap((issueId) => {
      const response = buildIssueFirstResponse(
        ctx,
        at,
        issueId,
        { kind: "action", via: input.action },
        seen.responded
      );
      return response ? [response] : [];
    });
    events.push(
      buildIssueAction(ctx, at, {
        action: input.action,
        target: input.target,
        instanceCount: input.instanceCount,
        resultingState: input.resultingState,
        fromDecisionOffer: input.fromDecisionOffer
      })
    );
    if (input.reason) {
      events.push(
        buildReasonWritten(ctx, at, input.reason.text, input.target, input.reason.source)
      );
    }
    return events;
  });
}
