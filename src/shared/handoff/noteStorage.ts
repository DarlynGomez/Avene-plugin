import { cutChars, META_SHORT_MAX_CHARS, NOTE_TEXT_MAX_CHARS } from "./limits";
import type { Owner } from "./types";

export const NOTE_CATEGORIES = ["alt", "heading", "name", "state", "question"] as const;
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

const OWNERS: readonly Owner[] = ["Dev", "PM", "Design"];

/** What a designer says about one layer, one note per category */
export interface NodeNote {
  category: NoteCategory;
  text: string;
  /** Alt only, true means the empty alt is on purpose and the text is ignored */
  decorative?: boolean;
  /** Heading only, 1 to 6 */
  headingLevel?: number;
  /** Question only */
  owner?: Owner;
  /** Who to ask about it, in the designer's own words, a name and a role */
  contact?: string;
  updatedAt: string;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Null when the shape is wrong, text over the cap is cut and not refused */
export function normalizeNote(value: unknown): NodeNote | null {
  const raw = asObject(value);
  if (!raw || typeof raw.updatedAt !== "string" || typeof raw.text !== "string") return null;
  const category = NOTE_CATEGORIES.find((name) => name === raw.category);
  if (!category) return null;
  const text = cutChars(raw.text.trim(), NOTE_TEXT_MAX_CHARS);
  const contact =
    typeof raw.contact === "string" ? cutChars(raw.contact.trim(), META_SHORT_MAX_CHARS) : "";
  const note: NodeNote = {
    category,
    text,
    updatedAt: raw.updatedAt,
    ...(contact ? { contact } : {})
  };
  if (category === "alt" && raw.decorative === true) return { ...note, text: "", decorative: true };
  if (category === "heading") {
    const level = raw.headingLevel;
    if (typeof level !== "number" || !Number.isInteger(level) || level < 1 || level > 6)
      return null;
    note.headingLevel = level;
  }
  if (category === "question") {
    const owner = OWNERS.find((name) => name === raw.owner);
    if (!owner) return null;
    note.owner = owner;
  }
  return text === "" ? null : note;
}

/** The last note of a category wins, bad entries are dropped */
export function cleanNotes(values: readonly unknown[]): NodeNote[] {
  const byCategory = new Map<NoteCategory, NodeNote>();
  for (const value of values) {
    const note = normalizeNote(value);
    if (note) byCategory.set(note.category, note);
  }
  return NOTE_CATEGORIES.flatMap((name) => byCategory.get(name) ?? []);
}

export function parseNodeNotes(raw: string): NodeNote[] {
  if (!raw) return [];
  try {
    const parsed = asObject(JSON.parse(raw));
    return parsed?.v === 1 && Array.isArray(parsed.notes) ? cleanNotes(parsed.notes) : [];
  } catch {
    return [];
  }
}

/** An empty string when there is nothing to keep, so the entry can be cleared */
export function serializeNodeNotes(notes: readonly unknown[]): string {
  const clean = cleanNotes(notes);
  return clean.length === 0 ? "" : JSON.stringify({ v: 1, notes: clean });
}

export function upsertNote(notes: readonly NodeNote[], note: NodeNote): NodeNote[] {
  return cleanNotes([...notes, note]);
}

export function removeNote(notes: readonly NodeNote[], category: NoteCategory): NodeNote[] {
  return notes.filter((note) => note.category !== category);
}

/** The index is node ids only, sorted and without repeats */
export function parseIndex(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((v) => typeof v === "string"))].sort()
      : [];
  } catch {
    return [];
  }
}

export function serializeIndex(ids: readonly string[]): string {
  return ids.length === 0 ? "" : JSON.stringify([...new Set(ids)].sort());
}
