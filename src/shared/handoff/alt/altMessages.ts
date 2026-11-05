import { NOTE_SOURCES, type NoteSource } from "../noteStorage";
import type { ImageLayer } from "./altTypes";

export type AltUiMessage =
  /** Asked for when the designer opens the alt text view, there is no watcher behind it */
  | { type: "HANDOFF_ALT_INVENTORY_REQUEST" }
  | {
      type: "HANDOFF_ALT_SET";
      nodeId: string;
      text: string;
      decorative: boolean;
      source: NoteSource;
    };

export interface AltInventoryMessage {
  type: "HANDOFF_ALT_INVENTORY";
  layers: ImageLayer[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function isAltUiMessage(value: unknown): value is AltUiMessage {
  if (!isRecord(value)) return false;
  if (value.type === "HANDOFF_ALT_INVENTORY_REQUEST") return true;
  return (
    value.type === "HANDOFF_ALT_SET" &&
    typeof value.nodeId === "string" &&
    typeof value.text === "string" &&
    typeof value.decorative === "boolean" &&
    NOTE_SOURCES.some((source) => source === value.source)
  );
}

export function isAltInventoryMessage(value: unknown): value is AltInventoryMessage {
  return isRecord(value) && value.type === "HANDOFF_ALT_INVENTORY" && Array.isArray(value.layers);
}
