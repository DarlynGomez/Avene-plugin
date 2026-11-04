import { nodeLink, parseFileUrl } from "../handoff/links";
import { formatRatio, plural } from "../handoff/text";
import type { FocusItem } from "./types";

export function eventTitle(count: number): string {
  const items = `${count} ${plural(count, "item", "items")}`;
  return count === 1
    ? `Design Review: A11y Triage (${items})`
    : `Design Review: Batch A11y Triage (${items})`;
}

function itemLines(item: FocusItem, index: number, fileUrl: string | undefined): string[] {
  const link = nodeLink(parseFileUrl(fileUrl), item.nodeId);
  const times = `${item.deferCount} ${plural(item.deferCount, "time", "times")}`;
  return [
    `${index + 1}. ${item.name}`,
    `   Measured ${formatRatio(item.measuredRatio)}:1, needs ${item.requiredRatio}:1`,
    `   Text ${item.foregroundHex} on ${item.backgroundHex}`,
    `   Background layer: ${item.ancestor}`,
    ...(item.binding ? [`   Token: ${item.binding}`] : []),
    `   Deferred ${times}, ${item.layers} ${plural(item.layers, "layer", "layers")} share this pair`,
    ...(link ? [`   Open in Figma: ${link}`] : [])
  ];
}

/** What the reminder says: the measured facts and a link back to the layer */
export function eventBody(items: readonly FocusItem[], fileUrl?: string): string {
  const intro = "Avene set this time aside for decisions that were deferred more than once";
  return [intro, "", ...items.flatMap((item, i) => [...itemLines(item, i, fileUrl), ""])]
    .join("\n")
    .trim();
}

/** The first deep link, which a calendar can keep as the event address */
export function firstLink(items: readonly FocusItem[], fileUrl?: string): string | null {
  const ref = parseFileUrl(fileUrl);
  return items.length > 0 ? nodeLink(ref, items[0].nodeId) : null;
}
