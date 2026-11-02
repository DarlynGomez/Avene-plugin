import { LABEL_DECISION, LABEL_DETECTED, LABEL_NEEDS_CHECK } from "./labels";
import type { SlotBuilder } from "./slots";
import { suggestColor } from "./suggestFix";
import { dateOnly, formatRatio, oneLine, plural } from "./text";
import type { HandoffItem, LineOptions } from "./types";

export const FULL: LineOptions = { hex: true, names: true, status: true };

function ratios(item: HandoffItem, slots: SlotBuilder): string {
  const r = item.representative;
  return `measured ${slots.auto("r", formatRatio(r.measuredRatio))}:1, needs ${slots.auto("q", r.requiredRatio)}:1`;
}

function colors(item: HandoffItem, slots: SlotBuilder): string {
  const r = item.representative;
  return `${slots.auto("fg", r.foregroundHex)} on ${slots.auto("bg", r.backgroundHex)}`;
}

function where(item: HandoffItem, slots: SlotBuilder, names: boolean): string {
  const screen = slots.auto("S", item.screenName);
  return names
    ? `"${slots.auto("L", item.representative.nodeName)}" on ${screen}`
    : `Text on ${screen}`;
}

function linkText(item: HandoffItem, slots: SlotBuilder, o: LineOptions): string {
  const link = item.representative.link;
  return link && o.names ? ` Link: ${slots.auto("k", link)}` : "";
}

export function actionLines(item: HandoffItem, slots: SlotBuilder, o = FULL): string[] {
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
  const measured = o.hex
    ? `text ${colors(item, slots)}, ${ratios(item, slots)}`
    : ratios(item, slots);
  const criterion = slots.put("sc", "WCAG 1.4.3");
  const lines = [
    `${LABEL_DETECTED}: ${where(item, slots, o.names)}: ${measured} (${criterion}). ${share} ${binding}${linkText(item, slots, o)}`
  ];
  const suggestion = o.hex ? suggestColor(r.foregroundHex, r.backgroundHex, r.requiredRatio) : null;
  if (suggestion) {
    lines.push(
      `${LABEL_DETECTED}: A color on the same hue that would reach it: ${slots.auto("sg", suggestion.hex)}, measuring ${slots.auto("sr", suggestion.ratio)}:1.`
    );
  }
  return lines;
}

function statusLine(item: HandoffItem, slots: SlotBuilder, o: LineOptions): string {
  const { meta } = item;
  const link = linkText(item, slots, o);
  if (meta.signOff === "needs") return `${LABEL_NEEDS_CHECK}: Status: Needs sign-off.${link}`;
  const by = meta.signedBy ? ` by ${slots.auto("p", oneLine(meta.signedBy))}` : "";
  const at = meta.signedAt ? `, ${slots.auto("d", dateOnly(meta.signedAt))}` : "";
  return `${LABEL_DECISION}: Signed off${by}${at}.${link}`;
}

export function leftLines(item: HandoffItem, slots: SlotBuilder, o = FULL): string[] {
  const { decision, meta } = item;
  const count = item.instances.length;
  const layers = `${slots.auto("c", count)} ${plural(count, "layer", "layers")}`;
  const sc = slots.put("sc", "WCAG 1.4.3");
  const measured = o.hex ? `${colors(item, slots)}, ${ratios(item, slots)}` : ratios(item, slots);
  const lines = [
    `${LABEL_DETECTED}: ${where(item, slots, o.names)}: ${measured} (${sc}), ${layers}.`
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
  if (o.status) lines.push(statusLine(item, slots, o));
  return lines;
}
