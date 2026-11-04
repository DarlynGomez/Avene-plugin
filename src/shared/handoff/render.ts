import { displayLabel, LABELS } from "./labels";
import { fillSlots } from "./slots";
import type { Audience, AudienceDoc, Label } from "./types";

const LEAD = /^(Detected|Decision|Needs check)/;

/** Plain words replace the label for everyone but developers, the owner stays */
export function relabel(line: string, audience: Audience): string {
  return line.replace(LEAD, (label) => displayLabel(label as Label, audience));
}

export function renderLines(
  lines: readonly string[],
  slots: Readonly<Record<string, string>>,
  audience: Audience
): string[] {
  return lines.map((line) => relabel(fillSlots(line, slots), audience));
}

/** Header, notices, then each section under a heading line */
export function renderAudience(doc: AudienceDoc): string {
  const out = [...doc.header, ...doc.notices];
  for (const part of doc.sections) {
    out.push("", `## ${part.title}`, ...renderLines(part.lines, doc.slots, doc.audience));
  }
  return out.join("\n");
}

/** The only lines allowed to carry no label: the header block and the fixed notices */
export function exemptLines(doc: AudienceDoc): string[] {
  return [...doc.header, ...doc.notices];
}

/** The reverse of relabel, so text shown in plain words can be checked against the canonical labels */
export function canonicalLabel(line: string, audience: Audience): string {
  if (audience === "developer") return line;
  const hit = LABELS.find((label) => line.startsWith(displayLabel(label, audience)));
  return hit ? hit + line.slice(displayLabel(hit, audience).length) : line;
}
