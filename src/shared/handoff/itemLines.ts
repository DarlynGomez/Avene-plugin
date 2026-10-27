import { LABEL_DECISION, LABEL_DETECTED, LABEL_NEEDS_CHECK } from "./labels";
import type { SlotBuilder } from "./slots";
import { dateOnly, formatRatio, oneLine, plural } from "./text";
import type { HandoffItem } from "./types";

/** Hex pair, ratios and criterion, shared by action and left items */
function measuredText(item: HandoffItem, slots: SlotBuilder): string {
  const r = item.representative;
  const colors = `${slots.auto("fg", r.foregroundHex)} on ${slots.auto("bg", r.backgroundHex)}`;
  const ratios = `measured ${slots.auto("r", formatRatio(r.measuredRatio))}:1, needs ${slots.auto("q", r.requiredRatio)}:1`;
  return `${colors}, ${ratios}`;
}

function where(item: HandoffItem, slots: SlotBuilder): string {
  return `"${slots.auto("L", item.representative.nodeName)}" on ${slots.auto("S", item.screenName)}`;
}

function linkText(item: HandoffItem, slots: SlotBuilder): string {
  const link = item.representative.link;
  return link ? ` Link: ${slots.auto("k", link)}` : "";
}

export function actionLines(item: HandoffItem, slots: SlotBuilder): string[] {
  const r = item.representative;
  const count = item.instances.length;
  const share =
    count === 1
      ? "This is the only layer on this screen with this pair."
      : `${slots.auto("c", count)} layers on this screen share this pair.`;
  const binding =
    r.foregroundBinding === null
      ? "Not bound to a variable."
      : `Bound to ${slots.auto("b", r.foregroundBinding)}.`;
  const criterion = slots.put("sc", "WCAG 1.4.3");
  return [
    `${LABEL_DETECTED}: ${where(item, slots)}: text ${measuredText(item, slots)} (${criterion}). ${share} ${binding}${linkText(item, slots)}`
  ];
}

function statusLine(item: HandoffItem, slots: SlotBuilder): string {
  const { meta } = item;
  const link = linkText(item, slots);
  if (meta.signOff === "needs") return `${LABEL_NEEDS_CHECK}: Status: Needs sign-off.${link}`;
  const by = meta.signedBy ? ` by ${slots.auto("p", oneLine(meta.signedBy))}` : "";
  const at = meta.signedAt ? `, ${slots.auto("d", dateOnly(meta.signedAt))}` : "";
  return `${LABEL_DECISION}: Signed off${by}${at}.${link}`;
}

export function leftLines(item: HandoffItem, slots: SlotBuilder): string[] {
  const { decision, meta } = item;
  const count = item.instances.length;
  const layers = `${slots.auto("c", count)} ${plural(count, "layer", "layers")}`;
  const sc = slots.put("sc", "WCAG 1.4.3");
  const lines = [
    `${LABEL_DETECTED}: ${where(item, slots)}: ${measuredText(item, slots)} (${sc}), ${layers}.`
  ];
  lines.push(
    decision
      ? `${LABEL_DECISION}: ${slots.auto("w", oneLine(decision.reason))} (recorded ${slots.auto("d", dateOnly(decision.recordedAt))})`
      : `${LABEL_DECISION}: Reason: not recorded.`
  );
  if (meta.mitigation) {
    lines.push(`${LABEL_DECISION}: Mitigation: ${slots.auto("w", oneLine(meta.mitigation))}`);
  }
  const parts = [
    meta.decidedBy ? `Decided by ${slots.auto("p", oneLine(meta.decidedBy))}.` : "",
    meta.revisitTrigger ? `Revisit: ${slots.auto("w", oneLine(meta.revisitTrigger))}` : ""
  ].filter((part) => part !== "");
  if (parts.length > 0) lines.push(`${LABEL_DECISION}: ${parts.join(" ")}`);
  if (decision && item.instances.some((i) => i.changedSinceIgnore)) {
    lines.push(
      `${LABEL_DETECTED}: Worse since it was decided: ${decision.severityAtDecision} then, ${item.highestSeverity} now.`
    );
  }
  lines.push(statusLine(item, slots));
  return lines;
}
