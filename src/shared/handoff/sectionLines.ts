import { ADVISORY_LABEL } from "./fixedLines";
import { LABEL_DECISION, LABEL_NEEDS_CHECK } from "./labels";
import type { SlotBuilder } from "./slots";
import { formatRatio, oneLine, plural } from "./text";
import type { DocSection, HandoffChange, HandoffItem, HandoffNote, HandoffQuestion } from "./types";

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

const NOTE_WORDS: Record<string, string> = {
  alt: "Alt text for",
  heading: "Heading level",
  name: "Accessible name for",
  state: "Missing state for"
};

/** What the designer says about layers, never checked by Avene, so every line is a Decision */
export function noteLines(notes: readonly HandoffNote[], slots: SlotBuilder): string[] {
  return notes.map(({ nodeName, link, note }) => {
    const layer = `"${slots.auto("L", nodeName)}"`;
    const who =
      note.contact && note.category !== "question"
        ? ` Owner: ${slots.auto("p", oneLine(note.contact))}.`
        : "";
    const tail = `${who}${link ? ` Link: ${slots.auto("k", link)}` : ""}`;
    if (note.category === "alt" && note.decorative) {
      return `${LABEL_DECISION}: ${layer} is decorative, so the alt text is empty.${tail}`;
    }
    const word = NOTE_WORDS[note.category] ?? "Note on";
    const level =
      note.category === "heading" ? ` ${slots.auto("n", note.headingLevel ?? 0)} for` : "";
    return `${LABEL_DECISION}: ${word}${level} ${layer}: ${slots.auto("w", oneLine(note.text))}${tail}`;
  });
}
