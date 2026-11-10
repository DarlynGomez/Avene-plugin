import { buildItems } from "./buildItems";
import { TICKET_IMPACT } from "./fixedLines";
import { parseFileUrl } from "./links";
import { suggestColor } from "./suggestFix";
import { formatRatio, plural } from "./text";
import type { HandoffInput, HandoffItem } from "./types";

/** Layer links shown in one ticket before the rest are counted */
export const TICKET_LINK_CAP = 10;

/** A template convention for acceptance criteria, not a measured figure */
export const MAX_CRITERIA = 7;

const KEYBOARD_CRITERION =
  "- [ ] A keyboard and screen reader pass of this screen is done by hand (Needs check)";

export interface Ticket {
  screenId: string;
  title: string;
  lines: string[];
}

function criterion(item: HandoffItem, hex: boolean): string {
  const r = item.representative;
  if (!hex) {
    return `- [ ] "${r.nodeName}" reaches at least ${r.requiredRatio}:1 against its background (measured ${formatRatio(r.measuredRatio)}:1)`;
  }
  const fix = suggestColor(r.foregroundHex, r.backgroundHex, r.requiredRatio);
  const hint = fix
    ? `. A color on the same hue that would reach it: ${fix.hex} (${fix.ratio}:1)`
    : "";
  return `- [ ] "${r.nodeName}" reaches at least ${r.requiredRatio}:1 against ${r.backgroundHex} (measured ${formatRatio(r.measuredRatio)}:1)${hint}`;
}

function layerLines(items: readonly HandoffItem[]): string[] {
  const layers = items.flatMap((item) => item.instances);
  const linked = layers.filter((layer) => layer.link);
  if (linked.length === 0) return [];
  const shown = linked.slice(0, TICKET_LINK_CAP).map((l) => `- ${l.nodeName}: ${l.link}`);
  const more = layers.length - shown.length;
  return [
    "Layers",
    ...shown,
    ...(more > 0 ? [`- and ${more} more ${plural(more, "layer", "layers")}`] : [])
  ];
}

function build(
  chunk: readonly HandoffItem[],
  title: string,
  input: HandoffInput,
  exceptions: number,
  hex: boolean
): Ticket {
  const first = chunk[0];
  const design = first.representative.link ? `Design: ${first.representative.link}` : "";
  const handoff = parseFileUrl(input.fileUrl) ? `Handoff: ${input.fileUrl?.trim()}` : "";
  const links = [design, handoff].filter((part) => part !== "").join("   ");
  const lines = [
    `Title: ${title}`,
    `Impact: ${TICKET_IMPACT}`,
    ...(links ? [links] : []),
    "Acceptance criteria",
    ...chunk.map((item) => criterion(item, hex)),
    KEYBOARD_CRITERION,
    ...layerLines(chunk),
    ...(exceptions > 0
      ? [
          `Known exception: ${exceptions} ${plural(exceptions, "item", "items")} knowingly left as-is, see the handoff document.`
        ]
      : [])
  ];
  return { screenId: first.screenId, title, lines };
}

/** One ticket per screen, split by root when criteria would pass the convention */
/** Color codes belong to the developer version, anyone else gets the ratios and the layer */
export function buildTickets(input: HandoffInput, hex = true): Ticket[] {
  const { items } = buildItems(input);
  const tickets: Ticket[] = [];
  for (const screen of input.screens) {
    const action = items.filter((i) => i.kind === "action" && i.screenId === screen.id);
    const exceptions = items.filter((i) => i.kind === "left" && i.screenId === screen.id).length;
    const size = MAX_CRITERIA - 1;
    const parts = Math.ceil(action.length / size);
    for (let index = 0; index < parts; index += 1) {
      const chunk = action.slice(index * size, (index + 1) * size);
      const layers = chunk.reduce((sum, item) => sum + item.instances.length, 0);
      const part = parts > 1 ? ` (part ${index + 1} of ${parts})` : "";
      const title = `[A11y] ${screen.name}: text contrast, ${layers} ${plural(layers, "layer", "layers")}${part}`;
      tickets.push(build(chunk, title, input, exceptions, hex));
    }
  }
  return tickets;
}

export function renderTicket(ticket: Ticket): string {
  return ticket.lines.join("\n");
}
