import { buildItems } from "./buildItems";
import { findingsHash, structureHash } from "./hash";
import { buildHeader } from "./header";
import { NOT_COVERED_LINE } from "./fixedLines";
import { actionLines, leftLines } from "./itemLines";
import { advisorySection, changeLines, questionLines } from "./sectionLines";
import { createSlots, fillSlots } from "./slots";
import { summaryLines } from "./summaryLines";
import type { DocSection, HandoffDoc, HandoffInput } from "./types";

function section(id: string, title: string, lines: readonly string[]): DocSection[] {
  return lines.length > 0 ? [{ id, title, lines }] : [];
}

/** The one page document in slot form, an empty section is left out */
export function buildDoc(input: HandoffInput): HandoffDoc {
  const slots = createSlots();
  const { items, deferredLayers } = buildItems(input);
  const action = items.filter((item) => item.kind === "action");
  const left = items.filter((item) => item.kind === "left");
  const advisory = advisorySection(items, slots);

  const sections: DocSection[] = [
    ...section(
      "summary",
      "Summary",
      summaryLines(items, deferredLayers, input.questions.length, slots)
    ),
    ...section(
      "action",
      "Needs developer action",
      action.flatMap((i) => actionLines(i, slots))
    ),
    ...section(
      "left",
      "Knowingly left as-is",
      left.flatMap((i) => leftLines(i, slots))
    ),
    ...section("changes", "Changes made in this file", changeLines(input.changes, slots)),
    ...section("questions", "Open questions", questionLines(input.questions, slots)),
    ...(advisory ? [advisory] : []),
    { id: "notCovered", title: "Not covered", lines: [NOT_COVERED_LINE] }
  ];
  const table = slots.table();
  const hash = findingsHash(table);
  return {
    header: buildHeader(input, hash),
    hash,
    structureHash: structureHash(sections, table),
    sections,
    slots: table
  };
}

/** Plain text, headings start with two hashes and are exempt like the header */
export function renderDoc(doc: HandoffDoc): string {
  const out = [...doc.header];
  for (const part of doc.sections) {
    out.push("", `## ${part.title}`, ...part.lines.map((line) => fillSlots(line, doc.slots)));
  }
  return out.join("\n");
}
