import { altRows } from "./tableAltRows";
import { statusFor } from "./tableStatus";
import { buildItems } from "./buildItems";
import { CHECKS_LINE, NOT_COVERED_LINE } from "./fixedLines";
import { LABEL_DECISION, LABEL_DETECTED, LABEL_NEEDS_CHECK } from "./labels";
import {
  EMPTY_TABLE_SENTENCE,
  type GroupId,
  type HandoffTableModel,
  type TableGroup,
  type TableRow
} from "./tableTypes";
import { dateOnly, formatRatio, oneLine, plural } from "./text";
import type { Audience, HandoffInput, HandoffItem, Label } from "./types";

/** Hex values never print here, names print for developers and PMs only, the same reach as the other versions */
const SHOW_NAMES: Record<Audience, boolean> = {
  developer: true,
  pm: true,
  higherUp: false,
  client: false
};

/** Developers get the items that still need action, everyone else the ones knowingly left as they are */
function itemsFor(input: HandoffInput, audience: Audience): HandoffItem[] {
  const { items } = buildItems(input);
  if (audience === "developer") return items.filter((item) => item.kind === "action");
  const left = items.filter((item) => item.kind === "left");
  return audience === "higherUp" ? left.filter((item) => item.meta.signOff === "needs") : left;
}

function noteFor(item: HandoffItem): string {
  const parts: string[] = [];
  const { meta, decision } = item;
  if (meta.mitigation) parts.push(`Mitigation: ${oneLine(meta.mitigation)}`);
  if (meta.revisitTrigger) parts.push(`Revisit: ${oneLine(meta.revisitTrigger)}`);
  if (decision && item.instances.some((i) => i.changedSinceIgnore)) {
    parts.push(
      `Worse since it was decided: ${decision.severityAtDecision} then, ${item.highestSeverity} now`
    );
  }
  return parts.join(". ");
}

function rowFor(item: HandoffItem, audience: Audience): TableRow {
  const r = item.representative;
  const count = item.instances.length;
  const screen =
    count > 1
      ? `${item.screenName}, ${count} ${plural(count, "layer", "layers")}`
      : item.screenName;
  const action = item.kind === "action";
  const label = action
    ? LABEL_DETECTED
    : item.meta.signOff === "signed"
      ? LABEL_DECISION
      : LABEL_NEEDS_CHECK;
  return {
    id: item.signature,
    element: SHOW_NAMES[audience] ? r.nodeName : "Text layer",
    location: screen,
    measured: `${formatRatio(r.measuredRatio)}:1`,
    required: `${r.requiredRatio}:1`,
    status: statusFor(label, audience),
    decision: action ? "" : oneLine(item.decision?.reason ?? ""),
    decidedBy: action ? "Dev" : oneLine(item.meta.decidedBy ?? ""),
    note: action ? "" : noteFor(item),
    nodeIds: item.instances.map((i) => i.nodeId)
  };
}

const TITLES: Record<GroupId, string> = { contrast: "Text contrast", alt: "Alt text" };

/**
 * The one table every version of the handoff reads: a row for each color pair, grouped by kind of issue
 * Nothing here is written by a model, and the same explanation is never printed twice
 */
export function buildHandoffTable(
  input: HandoffInput,
  audience: Audience,
  buildId: string | null = null
): HandoffTableModel {
  const contrast = itemsFor(input, audience).map((item) => rowFor(item, audience));
  const alt = audience === "developer" ? altRows(input, audience) : [];
  const groups: TableGroup[] = (
    [
      { id: "contrast", rows: contrast },
      { id: "alt", rows: alt }
    ] as const
  )
    .filter((group) => group.rows.length > 0)
    .map((group) => ({ id: group.id, title: TITLES[group.id], rows: group.rows }));
  const rows = groups.flatMap((group) => group.rows);
  const count = (label: Label) => rows.filter((row) => row.status.label === label).length;
  return {
    audience,
    header: {
      fileName: input.fileName,
      screens: input.screens.map((screen) => screen.name),
      date: dateOnly(input.generatedAt),
      buildId,
      counts: {
        rows: rows.length,
        groups: groups.length,
        detected: count(LABEL_DETECTED),
        decision: count(LABEL_DECISION),
        needsCheck: count(LABEL_NEEDS_CHECK)
      }
    },
    groups,
    footer: { notCovered: NOT_COVERED_LINE, limitation: CHECKS_LINE },
    empty: rows.length === 0 ? EMPTY_TABLE_SENTENCE : null
  };
}
