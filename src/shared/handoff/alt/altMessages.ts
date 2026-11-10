import { NOTE_SOURCES, type NoteSource } from "../noteStorage";
import type { CachedSuggestion } from "./altSuggestCache";
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
    }
  /** A picture of one layer for the suggestion, a read of the file and nothing written */
  | { type: "HANDOFF_ALT_CROP_REQUEST"; nodeId: string }
  | { type: "HANDOFF_ALT_CACHE_REQUEST" }
  /** Development only: clears everything a model wrote so a demo can start again */
  | { type: "HANDOFF_AI_RESET" }
  | { type: "HANDOFF_ALT_CACHE_SET"; entries: CachedSuggestion[] };

export interface AltInventoryMessage {
  type: "HANDOFF_ALT_INVENTORY";
  layers: ImageLayer[];
}

export type CropFailure = "layer-gone" | "export-failed";

export type AltCropMessage =
  | {
      type: "HANDOFF_ALT_CROP";
      nodeId: string;
      ok: true;
      image: string;
      width: number;
      height: number;
    }
  | { type: "HANDOFF_ALT_CROP"; nodeId: string; ok: false; reason: CropFailure };

/** The saved suggestions as stored, sent after a request and after a save */
export interface AltCacheMessage {
  type: "HANDOFF_ALT_CACHE";
  entries: CachedSuggestion[];
  saved?: boolean;
  error?: string;
}

/** What the reset cleared, so the panel can say it */
export interface AiResetResult {
  type: "HANDOFF_AI_RESET_RESULT";
  drafts: number;
  suggestions: number;
  notes: number;
  annotationsRemoved: number;
  annotationsLeft: number;
}

export type AltPluginMessage =
  AltInventoryMessage | AltCropMessage | AltCacheMessage | AiResetResult;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function isAltUiMessage(value: unknown): value is AltUiMessage {
  if (!isRecord(value)) return false;
  if (
    value.type === "HANDOFF_ALT_INVENTORY_REQUEST" ||
    value.type === "HANDOFF_ALT_CACHE_REQUEST" ||
    value.type === "HANDOFF_AI_RESET"
  )
    return true;
  if (value.type === "HANDOFF_ALT_CROP_REQUEST") return typeof value.nodeId === "string";
  if (value.type === "HANDOFF_ALT_CACHE_SET") return Array.isArray(value.entries);
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

export function isAltPluginMessage(value: unknown): value is AltPluginMessage {
  if (!isRecord(value)) return false;
  if (value.type === "HANDOFF_ALT_CROP") {
    return typeof value.nodeId === "string" && typeof value.ok === "boolean";
  }
  if (value.type === "HANDOFF_ALT_CACHE") return Array.isArray(value.entries);
  if (value.type === "HANDOFF_AI_RESET_RESULT") return typeof value.drafts === "number";
  return isAltInventoryMessage(value);
}
