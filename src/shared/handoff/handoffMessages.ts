import type { RootDecision } from "../grouping/groupingTypes";
import type { IssueSummary } from "../issues/issueTypes";
import { parseRootSignature } from "../issues/rootSignature";
import {
  isAltPluginMessage,
  isAltUiMessage,
  type AltPluginMessage,
  type AltUiMessage
} from "./alt/altMessages";
import { normalizeMeta, type HandoffMetaMap } from "./metaStorage";
import type { DraftCache } from "./draftCache";
import type { NodeNote } from "./noteStorage";
import type { HandoffItemMeta } from "./types";

/** The fields of an Adjust log entry that a handoff document reads, the rest is left out */
export interface HandoffAdjustEntry {
  issueId: string;
  optionChosen: "a" | "b" | "c" | null;
  beforeHex: string;
  beforeRatio: number;
  afterHex: string | null;
  afterRatio: number | null;
  abandoned: boolean;
  instanceCount: number;
  loggedAt: string;
}

export type HandoffUiMessage =
  | { type: "HANDOFF_DATA_REQUEST" }
  | { type: "HANDOFF_NOTES_SET"; nodeId: string; notes: NodeNote[] }
  /** The panel works out the signature, the sandbox never does; live lets stale entries go */
  | { type: "HANDOFF_META_SET"; signature: string; meta: HandoffItemMeta; live?: string[] }
  | { type: "HANDOFF_FILE_URL_SET"; url: string }
  /** Drafts the panel made, kept in the file so a demo file carries them */
  | { type: "HANDOFF_DRAFTS_SET"; drafts: DraftCache }
  | AltUiMessage;

export interface HandoffDataMessage {
  type: "HANDOFF_DATA";
  generatedAt: string;
  fileName: string;
  issues: IssueSummary[];
  decisions: Record<string, RootDecision>;
  /** As stored, so it is empty unless logging consent was given */
  adjustLog: HandoffAdjustEntry[];
  notes: Record<string, NodeNote[]>;
  /** The current layer name for each id in notes */
  noteNames: Record<string, string>;
  meta: HandoffMetaMap;
  fileUrl: string | null;
  drafts: DraftCache;
}

export interface HandoffWriteResult {
  type: "HANDOFF_WRITE_RESULT";
  target: "notes" | "meta" | "fileUrl" | "drafts";
  saved: boolean;
  error?: string;
  nodeId?: string;
  meta?: HandoffMetaMap;
  fileUrl?: string | null;
  drafts?: DraftCache;
}

/** Sent for every handoff message while handoff is off or a study session is active */
export interface HandoffRefused {
  type: "HANDOFF_REFUSED";
}

export type HandoffPluginMessage =
  HandoffDataMessage | HandoffWriteResult | HandoffRefused | AltPluginMessage;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Shape only, a signature that does not parse or a meta of the wrong shape is refused here */
export function isHandoffUiMessage(value: unknown): value is HandoffUiMessage {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case "HANDOFF_DATA_REQUEST":
      return true;
    case "HANDOFF_NOTES_SET":
      return typeof value.nodeId === "string" && Array.isArray(value.notes);
    case "HANDOFF_META_SET":
      return (
        typeof value.signature === "string" &&
        parseRootSignature(value.signature) !== null &&
        normalizeMeta(value.meta) !== null &&
        (value.live === undefined ||
          (Array.isArray(value.live) && value.live.every((item) => typeof item === "string")))
      );
    case "HANDOFF_FILE_URL_SET":
      return typeof value.url === "string";
    case "HANDOFF_DRAFTS_SET":
      return isRecord(value.drafts);
    default:
      return isAltUiMessage(value);
  }
}

/** Shape only, the panel ignores any other message */
export function isHandoffPluginMessage(value: unknown): value is HandoffPluginMessage {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case "HANDOFF_REFUSED":
      return true;
    case "HANDOFF_ALT_INVENTORY":
      return isAltPluginMessage(value);
    case "HANDOFF_WRITE_RESULT":
      return typeof value.saved === "boolean";
    case "HANDOFF_DATA":
      return (
        Array.isArray(value.issues) &&
        Array.isArray(value.adjustLog) &&
        isRecord(value.decisions) &&
        isRecord(value.notes) &&
        isRecord(value.noteNames) &&
        isRecord(value.drafts) &&
        isRecord(value.meta)
      );
    default:
      return false;
  }
}
