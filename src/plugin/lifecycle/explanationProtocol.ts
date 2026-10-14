import type { ExplanationEventMessage } from "../../shared/study/explanationMessageTypes";
import {
  buildDepthChanged,
  buildExplanationDismissed,
  buildTeachMeWhyOpened
} from "../../shared/study/studyOtherEvents";
import { emitStudy } from "../study/adapter/studyEmitter";

/** Records what the panel reports about explanations, only a study session logs anything */
export function handleExplanationMessage(message: ExplanationEventMessage): void {
  const { event } = message;
  const at = new Date().toISOString();
  emitStudy((ctx) => {
    if (event.kind === "opened") return [buildTeachMeWhyOpened(ctx, at, event.key, event.source)];
    if (event.kind === "depth_changed")
      return [buildDepthChanged(ctx, at, event.key, event.toDepth)];
    return [buildExplanationDismissed(ctx, at, event.key)];
  });
}
