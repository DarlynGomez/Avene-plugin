import { measuredText, neededText, shortDate } from "./tableFormat";
import { statusFor } from "./tableStatus";
import type { TableNote, TableRow } from "./tableTypes";
import { oneLine } from "./text";
import type { Audience, HandoffChange, HandoffItem } from "./types";

/** Names print for developers and PMs only, the same reach as the other versions of the handoff */
const SHOW_NAMES: Record<Audience, boolean> = {
  developer: true,
  pm: true,
  higherUp: false,
  client: false
};

const LARGE_TEXT_NEEDS = 3;

function details(layers: number, required: number | null): string[] {
  return [
    ...(layers > 1 ? [`${layers} layers`] : []),
    ...(required !== null && required <= LARGE_TEXT_NEEDS ? ["large text"] : [])
  ];
}

/** An item that still fails: open, or important, with nothing decided yet */
export function openRow(item: HandoffItem, audience: Audience): TableRow {
  const r = item.representative;
  return {
    id: item.signature,
    element: SHOW_NAMES[audience] ? r.nodeName : "Text layer",
    location: item.screenName,
    details: details(item.instances.length, r.requiredRatio),
    contrast: { measured: measuredText(r.measuredRatio), required: neededText(r.requiredRatio) },
    status: statusFor("open"),
    // Nothing is known about an open item beyond the row itself, so there is no line to print
    detail: null,
    notes: [],
    nodeIds: item.instances.map((i) => i.nodeId)
  };
}

/** The fields the designer filled in for a decision, each only when it exists */
function decisionNotes(item: HandoffItem): TableNote[] {
  const { meta, decision } = item;
  const worse = decision && item.instances.some((i) => i.changedSinceIgnore);
  const by = oneLine(meta.decidedBy ?? "");
  const when = decision?.recordedAt ? `, ${shortDate(decision.recordedAt)}` : "";
  const quiet = (text: string): TableNote => ({ text, tone: "quiet" });
  return [
    ...(worse
      ? [
          {
            text: `Worse since it was decided: ${decision.severityAtDecision} then, ${item.highestSeverity} now.`,
            tone: "normal" as const
          }
        ]
      : []),
    ...(meta.mitigation ? [quiet(`Mitigation: ${oneLine(meta.mitigation)}`)] : []),
    ...(meta.revisitTrigger ? [quiet(`Revisit: ${oneLine(meta.revisitTrigger)}`)] : []),
    ...(by !== "" ? [quiet(`Decided by ${by}${when}`)] : [])
  ];
}

/** An item the designer knowingly left as it is, with the reason written for it */
export function ignoredRow(item: HandoffItem, audience: Audience): TableRow {
  const r = item.representative;
  const reason = oneLine(item.decision?.reason ?? "");
  return {
    id: item.signature,
    element: SHOW_NAMES[audience] ? r.nodeName : "Text layer",
    location: item.screenName,
    details: details(item.instances.length, r.requiredRatio),
    contrast: { measured: measuredText(r.measuredRatio), required: neededText(r.requiredRatio) },
    status: statusFor("ignored"),
    detail:
      reason === "" ? { text: "No reason recorded.", muted: true } : { text: reason, muted: false },
    notes: decisionNotes(item),
    nodeIds: item.instances.map((i) => i.nodeId)
  };
}

/** A color the designer changed in this file, what it was and what it is now */
export function adjustedRow(change: HandoffChange, index: number): TableRow {
  const required = change.requiredRatio ?? null;
  return {
    id: `change:${change.nodeId ?? index}`,
    element: change.nodeName,
    location: change.screenName ?? "",
    details: details(change.instanceCount, required),
    contrast: {
      measured: measuredText(change.beforeRatio),
      required: required === null ? null : neededText(required)
    },
    status: statusFor("adjusted"),
    detail: {
      text: `Fill ${change.beforeHex} changed to ${change.afterHex}. Now ${measuredText(change.afterRatio)}.`,
      muted: false
    },
    notes: [],
    nodeIds: change.nodeId ? [change.nodeId] : []
  };
}
