import { LABEL_DETECTED, LABEL_NEEDS_CHECK } from "./labels";
import type { SlotBuilder } from "./slots";
import { plural } from "./text";
import { highestSeverity } from "./buildItems";
import type { HandoffItem, LineOptions } from "./types";
import { FULL } from "./itemLines";

export function summaryLines(
  items: readonly HandoffItem[],
  deferredLayers: number,
  questionCount: number,
  slots: SlotBuilder,
  o: LineOptions = FULL
): string[] {
  const action = items.filter((item) => item.kind === "action");
  const left = items.filter((item) => item.kind === "left");
  const waiting = left.filter((item) => item.meta.signOff === "needs").length;
  const layers = action.reduce((sum, item) => sum + item.instances.length, 0);
  const lines: string[] = [];

  if (action.length === 0) {
    lines.push(
      `${LABEL_DETECTED}: No text contrast items need developer action in the chosen screens.`
    );
  } else {
    const n = slots.put("n_action", action.length);
    const pairs = slots.put("n_roots", action.length);
    const n_layers = slots.put("n_layers", layers);
    lines.push(
      `${LABEL_DETECTED}: ${n} text contrast ${plural(action.length, "item needs", "items need")} developer action (${pairs} color ${plural(action.length, "pair", "pairs")}, ${n_layers} ${plural(layers, "layer", "layers")}).`
    );
  }

  const parts: string[] = [];
  if (left.length > 0) {
    const waitingText = o.status ? `, ${slots.put("n_waiting", waiting)} waiting for sign-off` : "";
    parts.push(`${slots.put("n_left", left.length)} knowingly left as-is${waitingText}.`);
  }
  if (deferredLayers > 0 && o.status) {
    parts.push(`${slots.put("n_deferred", deferredLayers)} deferred (not for developers now).`);
  }
  if (parts.length > 0) lines.push(`${LABEL_DETECTED}: ${parts.join(" ")}`);

  if (action.length > 0 && o.status) {
    const severity = slots.put(
      "severity",
      highestSeverity(action.map((i) => ({ severity: i.highestSeverity })))
    );
    lines.push(`${LABEL_DETECTED}: Highest severity open: ${severity}.`);
  }
  if (questionCount > 0) {
    lines.push(
      `${LABEL_NEEDS_CHECK}: ${slots.put("n_questions", questionCount)} ${plural(questionCount, "question", "questions")} open.`
    );
  }
  return lines;
}
