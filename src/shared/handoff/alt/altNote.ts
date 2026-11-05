import { NOTE_TEXT_MAX_CHARS, cutChars } from "../limits";
import { removeNote, upsertNote, type NodeNote, type NoteSource } from "../noteStorage";
import { isAnnotated } from "./annotationFields";

export interface AltAnswer {
  text: string;
  decorative: boolean;
  source: NoteSource;
}

/** The annotation record of the current alt note, kept when the text changes so the status can say it is out of date */
function annotationOf(notes: readonly NodeNote[]): Partial<NodeNote> {
  const { annotated, annotatedAt, annotatedHash } =
    notes.find((note) => note.category === "alt") ?? {};
  return annotated ? { annotated, annotatedAt, annotatedHash } : {};
}

/** True when the answer would clear a note that still has an annotation, which would leave it on the canvas with nothing tracking it */
export function clearsAnnotatedNote(notes: readonly NodeNote[], answer: AltAnswer): boolean {
  return isAnnotated(notes) && !answer.decorative && answer.text.trim() === "";
}

/** Puts the alt answer into a layer's notes, an empty answer takes the alt note away, other notes stay */
export function applyAlt(notes: readonly NodeNote[], answer: AltAnswer, at: string): NodeNote[] {
  const text = cutChars(answer.text.trim(), NOTE_TEXT_MAX_CHARS);
  const kept = annotationOf(notes);
  if (answer.decorative) {
    return upsertNote(notes, {
      category: "alt",
      text: "",
      decorative: true,
      updatedAt: at,
      ...kept
    });
  }
  if (text === "") return removeNote(notes, "alt");
  const note: NodeNote = { category: "alt", text, updatedAt: at, ...kept };
  if (answer.source !== "designer") note.source = answer.source;
  return upsertNote(notes, note);
}
