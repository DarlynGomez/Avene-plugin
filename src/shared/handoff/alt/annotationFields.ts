import type { NodeNote } from "../noteStorage";

type Fields = Pick<NodeNote, "annotated" | "annotatedAt" | "annotatedHash">;

/** The annotation fields of a stored note, all three or none */
export function readAnnotationFields(raw: Record<string, unknown>): Fields {
  const { annotated, annotatedAt, annotatedHash } = raw;
  return annotated === true &&
    typeof annotatedAt === "string" &&
    typeof annotatedHash === "string" &&
    annotatedHash !== ""
    ? { annotated: true, annotatedAt, annotatedHash }
    : {};
}

/** Records that an annotation was written for the alt note, other notes are left as they are */
export function markAnnotated(notes: readonly NodeNote[], at: string, hash: string): NodeNote[] {
  return notes.map((note) =>
    note.category === "alt"
      ? { ...note, annotated: true as const, annotatedAt: at, annotatedHash: hash }
      : note
  );
}

export function clearAnnotated(notes: readonly NodeNote[]): NodeNote[] {
  return notes.map((note) => {
    if (note.category !== "alt") return note;
    const rest: NodeNote = { ...note };
    delete rest.annotated;
    delete rest.annotatedAt;
    delete rest.annotatedHash;
    return rest;
  });
}

/** Whether the layer's alt note has an annotation recorded */
export function isAnnotated(notes: readonly NodeNote[]): boolean {
  return notes.some((note) => note.category === "alt" && note.annotated === true);
}
