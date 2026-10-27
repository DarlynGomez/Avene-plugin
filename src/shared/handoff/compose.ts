import { renderLines } from "./render";
import type { AudienceDoc } from "./types";

/** Section id to the filled sentences the designer chose in place of the template lines */
export type ChosenText = Readonly<Record<string, readonly string[]>>;

/**
 * The text to copy. A chosen AI block follows its attribution line with the reviewer,
 * and one line at the top says which blocks they are; the fixed Not covered block is never replaced
 */
export function composeCopy(doc: AudienceDoc, chosen: ChosenText, reviewer: string): string {
  const titles = doc.sections
    .filter((s) => s.id !== "notCovered" && chosen[s.id])
    .map((s) => s.title);
  const out = [...doc.header, ...doc.notices];
  if (titles.length > 0) {
    out.push(
      `Parts of this version were drafted by a language model and reviewed by ${reviewer}: ${titles.join(", ")}.`
    );
  }
  for (const section of doc.sections) {
    const picked = section.id === "notCovered" ? undefined : chosen[section.id];
    out.push("", `## ${section.title}`);
    if (picked) {
      out.push(
        ...picked.map((line) => renderLines([line], {}, doc.audience)[0]),
        `(AI-drafted, reviewed by ${reviewer})`
      );
    } else {
      out.push(...renderLines(section.lines, doc.slots, doc.audience));
    }
  }
  return out.join("\n");
}
