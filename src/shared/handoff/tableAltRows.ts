import { LABEL_DECISION, LABEL_NEEDS_CHECK } from "./labels";
import { noteSource } from "./noteStorage";
import { statusFor } from "./tableStatus";
import type { TableRow } from "./tableTypes";
import { oneLine } from "./text";
import type { Audience, HandoffInput } from "./types";

/**
 * A row for each alt text note, and one for each image layer nobody has spoken for
 * An unspoken layer has no sentence of its own, so the same words are not printed for every picture
 */
export function altRows(input: HandoffInput, audience: Audience): TableRow[] {
  const notes = (input.notes ?? []).filter(({ note }) => note.category === "alt");
  const where = new Map((input.imageLayers ?? []).map((layer) => [layer.nodeId, layer.screenName]));
  const answered = new Set<string>();
  const rows = notes.map(({ nodeId, nodeName, note }): TableRow => {
    if (nodeId && (note.decorative || note.text.trim() !== "")) answered.add(nodeId);
    const drafted = noteSource(note) !== "designer";
    return {
      id: nodeId ?? nodeName,
      element: nodeName,
      location: (nodeId && where.get(nodeId)) || "",
      measured: null,
      required: null,
      status: statusFor(
        note.text.trim() === "" && !note.decorative ? LABEL_NEEDS_CHECK : LABEL_DECISION,
        audience
      ),
      decision: note.decorative ? "Decorative, alt text is empty" : oneLine(note.text),
      decidedBy: oneLine(note.contact ?? ""),
      note: drafted ? "Drafted by a language model, confirmed by the designer" : "",
      nodeIds: nodeId ? [nodeId] : []
    };
  });
  const open = (input.imageLayers ?? [])
    .filter((layer) => !answered.has(layer.nodeId))
    .map((layer): TableRow => ({
      id: layer.nodeId,
      element: layer.name,
      location: layer.screenName,
      measured: null,
      required: null,
      status: statusFor(LABEL_NEEDS_CHECK, audience),
      decision: "",
      decidedBy: "",
      note: "",
      nodeIds: [layer.nodeId]
    }));
  return [...rows, ...open];
}
