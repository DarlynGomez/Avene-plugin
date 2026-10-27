import { ADVISORY_LABEL } from "./fixedLines";
import { LABEL_DECISION, LABEL_NEEDS_CHECK } from "./labels";
import type { SlotBuilder } from "./slots";
import { formatRatio, oneLine, plural } from "./text";
import type { DocSection, HandoffChange, HandoffItem, HandoffQuestion } from "./types";

export function changeLines(changes: readonly HandoffChange[], slots: SlotBuilder): string[] {
  return changes.map((change) => {
    const from = `${slots.auto("fg", change.beforeHex)} (${slots.auto("r", formatRatio(change.beforeRatio))}:1)`;
    const to = `${slots.auto("fg", change.afterHex)} (${slots.auto("r", formatRatio(change.afterRatio))}:1)`;
    const count = slots.auto("c", change.instanceCount);
    return `${LABEL_DECISION}: "${slots.auto("L", change.nodeName)}" changed from ${from} to ${to}, ${count} ${plural(change.instanceCount, "layer", "layers")}.`;
  });
}

export function questionLines(questions: readonly HandoffQuestion[], slots: SlotBuilder): string[] {
  return questions.map((q) => {
    const link = q.link ? ` Link: ${slots.auto("k", q.link)}` : "";
    return `${LABEL_NEEDS_CHECK} (owner: ${q.owner}): ${slots.auto("w", oneLine(q.text))}${link}`;
  });
}

/** Hidden while every item is standard, which is always true today */
export function advisorySection(
  items: readonly HandoffItem[],
  slots: SlotBuilder,
  names = true
): DocSection | null {
  const flagged = items.filter((item) => item.condition !== "standard");
  if (flagged.length === 0) return null;
  const lines = [
    `${LABEL_NEEDS_CHECK}: ${ADVISORY_LABEL}.`,
    ...flagged.map((item) => {
      const condition: string = item.condition;
      return `${LABEL_NEEDS_CHECK}: ${names ? `"${slots.auto("L", item.representative.nodeName)}"` : "A text layer"} under the condition ${slots.auto("w", condition)}.`;
    })
  ];
  return { id: "advisory", title: "Advisory: conditions of use", lines };
}
