import { LABEL_DECISION, LABEL_NEEDS_CHECK } from "../labels";
import type { SlotBuilder } from "../slots";
import { oneLine, plural } from "../text";
import type { HandoffNote } from "../types";
import type { ImageLayer } from "./altTypes";

/** The ids of layers that have an alt note, an answer or a decorative mark */
function answeredIds(notes: readonly HandoffNote[]): Set<string> {
  const ids = new Set<string>();
  for (const { nodeId, note } of notes) {
    if (nodeId && note.category === "alt" && (note.decorative || note.text.trim() !== "")) {
      ids.add(nodeId);
    }
  }
  return ids;
}

/** What the designer said about each picture, then one count of the pictures nobody has spoken for */
export function altLines(
  notes: readonly HandoffNote[],
  layers: readonly ImageLayer[],
  slots: SlotBuilder
): string[] {
  const lines = notes
    .filter(({ note }) => note.category === "alt")
    .map(({ nodeName, link, note }) => {
      const layer = `"${slots.auto("L", nodeName)}"`;
      const tail = link ? ` Link: ${slots.auto("k", link)}` : "";
      const owner = note.contact ? ` Owner: ${slots.auto("p", oneLine(note.contact))}.` : "";
      if (note.decorative) {
        return `${LABEL_DECISION}: ${layer} is decorative, alt is empty${owner || tail ? "." : ""}${owner}${tail}`;
      }
      return `${LABEL_DECISION}: Alt text for ${layer}: ${slots.auto("w", oneLine(note.text))}${owner}${tail}`;
    });
  const answered = answeredIds(notes);
  const open = layers.filter((layer) => !answered.has(layer.nodeId)).length;
  if (open > 0) {
    const count = slots.auto("n", open);
    const noun = plural(open, "image layer has", "image layers have");
    lines.push(
      `${LABEL_NEEDS_CHECK}: ${count} ${noun} no alt text note or decorative mark yet. Avene cannot judge alt text quality.`
    );
  }
  return lines;
}
