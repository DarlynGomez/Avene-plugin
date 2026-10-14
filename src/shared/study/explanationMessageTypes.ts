import type { Depth, ExplanationKey } from "../teachMeWhy/explanationTypes";
import { depthOk, explanationKeyOk, sourceOk } from "./explanationEventSchema";

/** What the panel tells the sandbox so the study log can record it, nothing leaves the plugin */
export type ExplanationEvent =
  | { kind: "opened"; key: ExplanationKey; source: "tab" | "card" }
  | { kind: "depth_changed"; key: ExplanationKey; toDepth: Depth }
  | { kind: "dismissed"; key: ExplanationKey };

export interface ExplanationEventMessage {
  type: "EXPLANATION_EVENT";
  event: ExplanationEvent;
}

export function isExplanationMessage(value: unknown): value is ExplanationEventMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as { type?: unknown; event?: unknown };
  if (message.type !== "EXPLANATION_EVENT") return false;
  const event = message.event as Record<string, unknown> | null;
  if (typeof event !== "object" || event === null || !explanationKeyOk(event.key)) return false;
  if (event.kind === "opened") return sourceOk(event.source);
  if (event.kind === "depth_changed") return depthOk(event.toDepth);
  return event.kind === "dismissed";
}
