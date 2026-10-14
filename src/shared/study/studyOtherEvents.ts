import type { Depth, ExplanationKey } from "../teachMeWhy/explanationTypes";
import type { MarkerStyle } from "../markers/markerStyle";
import type {
  AdjustEventEvent,
  DepthChangedEvent,
  ExplanationDismissedEvent,
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
  markerCount = 0,
  style: MarkerStyle = "annotation"
): MarkerStateEvent {
  return { type: "marker_state", at, ctx, markersOn, change, markerCount, style };
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

export function buildTeachMeWhyOpened(
  ctx: StudyEventContext,
  at: string,
  key: ExplanationKey,
  source: "tab" | "card"
): ExplanationOpenedEvent {
  return { type: "explanation_opened", at, ctx, surface: "teach_me_why", key, source };
}

export function buildDepthChanged(
  ctx: StudyEventContext,
  at: string,
  key: ExplanationKey,
  toDepth: Depth
): DepthChangedEvent {
  return { type: "depth_changed", at, ctx, key, toDepth };
}

export function buildExplanationDismissed(
  ctx: StudyEventContext,
  at: string,
  key: ExplanationKey
): ExplanationDismissedEvent {
  return { type: "explanation_dismissed", at, ctx, key };
}
