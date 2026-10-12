import type {
  AdjustEventEvent,
  ExplanationOpenedEvent,
  MarkerStateChange,
  MarkerStateEvent,
  RoleAnsweredEvent,
  StudyEventContext
} from "./studyEvents";

export function buildAdjustEvent(
  ctx: StudyEventContext,
  at: string,
  ref: { adjustLogIndex: number; issueId: string; loggedAt: string }
): AdjustEventEvent {
  return { type: "adjust_event", at, ctx, ...ref };
}

export function buildMarkerState(
  ctx: StudyEventContext,
  at: string,
  markersOn: boolean,
  change: MarkerStateChange = markersOn ? "shown" : "hidden",
  markerCount = 0
): MarkerStateEvent {
  return { type: "marker_state", at, ctx, markersOn, change, markerCount };
}

export function buildExplanationOpened(
  ctx: StudyEventContext,
  at: string,
  surface: ExplanationOpenedEvent["surface"],
  issueId?: string
): ExplanationOpenedEvent {
  return issueId === undefined
    ? { type: "explanation_opened", at, ctx, surface }
    : { type: "explanation_opened", at, ctx, surface, issueId };
}

export function buildRoleAnswered(
  ctx: StudyEventContext,
  at: string,
  nodeId: string,
  role: string
): RoleAnsweredEvent {
  return { type: "role_answered", at, ctx, nodeId, role };
}
