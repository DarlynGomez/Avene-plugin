import { applyAlt, type AltAnswer } from "../../../shared/handoff/alt/altNote";
import { fits } from "../../../shared/handoff/limits";
import {
  parseIndex,
  parseNodeNotes,
  serializeIndex,
  serializeNodeNotes,
  type NodeNote
} from "../../../shared/handoff/noteStorage";
import { KEY_NODE_NOTES, KEY_NOTES_INDEX } from "../handoffKeys";
import { writeEntry, type StoreResult } from "./storeResult";

export type NotesByNode = Record<string, NodeNote[]>;

export function loadNotesIndex(): string[] {
  return parseIndex(figma.root.getPluginData(KEY_NOTES_INDEX));
}

function saveNotesIndex(ids: readonly string[]): StoreResult {
  return writeEntry(figma.root, KEY_NOTES_INDEX, serializeIndex(ids));
}

function isGone(node: BaseNode | null): boolean {
  return node === null || ("removed" in node && node.removed);
}

/** Reads the notes of every indexed layer, a layer that is gone or empty leaves the index */
export async function loadAllNotes(): Promise<NotesByNode> {
  const ids = loadNotesIndex();
  const notes: NotesByNode = {};
  for (const id of ids) {
    const node = await figma.getNodeByIdAsync(id);
    if (node === null || isGone(node)) continue;
    const found = parseNodeNotes(node.getPluginData(KEY_NODE_NOTES));
    if (found.length > 0) notes[id] = found;
  }
  if (Object.keys(notes).length !== ids.length) saveNotesIndex(Object.keys(notes));
  return notes;
}

/** An empty list clears the layer; the index is checked first so a refusal leaves both untouched */
export async function setNodeNotes(
  nodeId: string,
  notes: readonly NodeNote[]
): Promise<StoreResult> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (node === null || isGone(node))
    return { saved: false, error: "That layer is no longer in the file" };
  const value = serializeNodeNotes(notes);
  const rest = loadNotesIndex().filter((id) => id !== nodeId);
  const index = serializeIndex(value === "" ? rest : [...rest, nodeId]);
  if (!fits(index)) return { saved: false, error: "Too many layers have notes" };
  const written = writeEntry(node, KEY_NODE_NOTES, value);
  return written.saved ? writeEntry(figma.root, KEY_NOTES_INDEX, index) : written;
}

/** Reads the layer's notes, puts the alt answer in and writes them back, other categories are kept */
export async function setAltNote(nodeId: string, answer: AltAnswer): Promise<StoreResult> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (node === null || isGone(node))
    return { saved: false, error: "That layer is no longer in the file" };
  const current = parseNodeNotes(node.getPluginData(KEY_NODE_NOTES));
  return setNodeNotes(nodeId, applyAlt(current, answer, new Date().toISOString()));
}
