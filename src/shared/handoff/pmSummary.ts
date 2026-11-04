import { buildItems, highestSeverity } from "./buildItems";
import { PM_NOT_VERIFIED } from "./fixedLines";
import { LABEL_DETECTED, LABEL_NEEDS_CHECK } from "./labels";
import { renderLines } from "./render";
import { createSlots, type SlotBuilder } from "./slots";
import { formatRatio, plural } from "./text";
import type { HandoffInput, HandoffItem } from "./types";

/** The two measured lines and the not verified line, in slot form */
export function pmSummaryLines(
  items: readonly HandoffItem[],
  scope: string,
  slots: SlotBuilder
): string[] {
  const action = items.filter((item) => item.kind === "action");
  const waiting = items.filter((item) => item.kind === "left" && item.meta.signOff === "needs");
  const layers = action.reduce((sum, item) => sum + item.instances.length, 0);
  const where = slots.auto("S", scope);

  const first =
    action.length === 0
      ? `${LABEL_DETECTED}: No text contrast items need developer action in ${where}.`
      : `${LABEL_DETECTED}: ${where}: ${slots.put("n_action", action.length)} text contrast ${plural(action.length, "item", "items")} for developers (${slots.put("n_layers", layers)} ${plural(layers, "layer", "layers")}).`;

  const top = waiting.find(
    (item) =>
      item.highestSeverity ===
      highestSeverity(waiting.map((i) => ({ severity: i.highestSeverity })))
  );
  const second =
    waiting.length === 0 || !top
      ? `${LABEL_NEEDS_CHECK} (owner: PM): No sign-off waiting.`
      : `${LABEL_NEEDS_CHECK} (owner: PM): ${slots.put("n_waiting", waiting.length)} ${plural(waiting.length, "item", "items")} left as-is, waiting for sign-off. Highest: ${slots.auto("r", formatRatio(top.representative.measuredRatio))}:1 against ${slots.auto("q", top.representative.requiredRatio)}:1.`;

  return [first, second, PM_NOT_VERIFIED];
}

/** The three lines as the PM reads them, plain labels and no hex */
export function renderPmSummary(input: HandoffInput): string[] {
  const slots = createSlots();
  const { items } = buildItems(input);
  const scope = input.screens.length === 1 ? input.screens[0].name : input.fileName;
  return renderLines(pmSummaryLines(items, scope, slots), slots.table(), "pm");
}
