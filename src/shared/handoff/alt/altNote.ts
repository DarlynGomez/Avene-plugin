import { NOTE_TEXT_MAX_CHARS, cutChars } from "../limits";
import { removeNote, upsertNote, type NodeNote, type NoteSource } from "../noteStorage";

export interface AltAnswer {
  text: string;
  decorative: boolean;
  source: NoteSource;
}

/** Puts the alt answer into a layer's notes, an empty answer takes the alt note away, other notes stay */
export function applyAlt(notes: readonly NodeNote[], answer: AltAnswer, at: string): NodeNote[] {
  const text = cutChars(answer.text.trim(), NOTE_TEXT_MAX_CHARS);
  if (answer.decorative) {
    return upsertNote(notes, { category: "alt", text: "", decorative: true, updatedAt: at });
  }
  if (text === "") return removeNote(notes, "alt");
  const note: NodeNote = { category: "alt", text, updatedAt: at };
  if (answer.source !== "designer") note.source = answer.source;
  return upsertNote(notes, note);
}
