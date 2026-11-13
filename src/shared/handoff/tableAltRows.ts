import { statusFor } from "./tableStatus";
import type { TableRow } from "./tableTypes";
import { oneLine } from "./text";
import type { HandoffInput } from "./types";

/** The wording that already says a model drafted an alt text, kept as it is and never added to */
export const DRAFTED_BY_MODEL = "Drafted by a language model, confirmed by the designer";

/** The words for a picture nobody has spoken for, the owner is added only when the data has one */
const NO_ALT = "No alt text yet";

/** The designer is the default decider, so naming them says nothing */
const DEFAULT_OWNERS = ["", "designer", "design"];

/**
 * A row for each alt text note, and one for each image layer nobody has spoken for
 * The owner after Decides comes from the note, and a picture with no note has none to name
 */
export function altRows(input: HandoffInput): TableRow[] {
  const notes = (input.notes ?? []).filter(({ note }) => note.category === "alt");
  const where = new Map((input.imageLayers ?? []).map((layer) => [layer.nodeId, layer.screenName]));
  const answered = new Set<string>();
  const rows = notes.map(({ nodeId, nodeName, note }): TableRow => {
    const text = oneLine(note.text);
    const spoken = note.decorative || text !== "";
    if (nodeId && spoken) answered.add(nodeId);
    const owner = oneLine(note.contact ?? "");
    // The data records a source only for a note a model drafted, one the designer wrote has none to print
    const drafted = note.source !== undefined;
    return {
      id: nodeId ?? nodeName,
      element: nodeName,
      location: (nodeId && where.get(nodeId)) || "",
      details: [],
      contrast: null,
      status: statusFor(spoken ? "decided" : "needsCheck"),
      detail: note.decorative
        ? { text: "Decorative, alt text is empty", muted: false }
        : text !== ""
          ? { text: `“${text}”`, muted: false }
          : {
              text: DEFAULT_OWNERS.includes(owner.toLowerCase())
                ? NO_ALT
                : `${NO_ALT} · Decides: ${owner}`,
              muted: true
            },
      notes: drafted && spoken ? [{ text: DRAFTED_BY_MODEL, tone: "quiet" }] : [],
      nodeIds: nodeId ? [nodeId] : []
    };
  });
  const open = (input.imageLayers ?? [])
    .filter((layer) => !answered.has(layer.nodeId) && !notes.some((n) => n.nodeId === layer.nodeId))
    .map((layer): TableRow => ({
      id: layer.nodeId,
      element: layer.name,
      location: layer.screenName,
      details: [],
      contrast: null,
      status: statusFor("needsCheck"),
      detail: { text: NO_ALT, muted: true },
      notes: [],
      nodeIds: [layer.nodeId]
    }));
  return [...rows, ...open];
}
