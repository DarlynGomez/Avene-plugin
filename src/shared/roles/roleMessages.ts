import { ROLE_LABELS, type DecidedRole, type RoleLabel } from "./roleLabels";
import type { RoleServerReply, RoleServerRequest } from "./roleRequest";
import type { RoleResponse } from "./roleStorage";

/** What the panel needs to draw the question for one text layer */
export interface RoleStateView {
  nodeId: string;
  /** The participant may be shown a role question right now */
  allowed: boolean;
  rule: { role: DecidedRole; ruleId: string; reason: string } | null;
  /** A model suggestion that may be shown as a question, never used until answered */
  suggestion: { label: RoleLabel; model: string | null; live: boolean } | null;
  answer: { role: RoleLabel; response: RoleResponse } | null;
  /** Set when the panel should ask the server, the sandbox has already made the crop */
  request: RoleServerRequest | null;
}

export interface PrecomputeSummary {
  total: number;
  completed: number;
  skipped: number;
  failed: number;
  csv: string;
}

export type RoleUiMessage =
  | { type: "ROLE_QUERY"; nodeId: string }
  | { type: "ROLE_SERVER_RESULT"; nodeId: string; reply: RoleServerReply }
  | { type: "ROLE_ANSWER"; nodeId: string; role: RoleLabel; response: RoleResponse }
  | { type: "ROLE_PRECOMPUTE_SUBSCRIBE" }
  | {
      type: "ROLE_PRECOMPUTE_RESULT";
      nodeId: string;
      reply: RoleServerReply | null;
      failure: string | null;
    };

export type RolePluginMessage =
  | { type: "ROLE_STATE"; state: RoleStateView }
  | { type: "ROLE_PRECOMPUTE_START"; total: number }
  | {
      type: "ROLE_PRECOMPUTE_ITEM";
      index: number;
      total: number;
      nodeId: string;
      request: RoleServerRequest;
    }
  | { type: "ROLE_PRECOMPUTE_DONE"; summary: PrecomputeSummary };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isLabel = (value: unknown): value is RoleLabel => ROLE_LABELS.includes(value as RoleLabel);

/** Shape only, a label outside the list or an unknown response is refused here */
export function isRoleUiMessage(value: unknown): value is RoleUiMessage {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case "ROLE_PRECOMPUTE_SUBSCRIBE":
      return true;
    case "ROLE_QUERY":
      return typeof value.nodeId === "string";
    case "ROLE_SERVER_RESULT":
      return (
        typeof value.nodeId === "string" && isRecord(value.reply) && isLabel(value.reply.label)
      );
    case "ROLE_ANSWER":
      return (
        typeof value.nodeId === "string" &&
        isLabel(value.role) &&
        ["confirmed", "changed", "unsure"].includes(String(value.response))
      );
    case "ROLE_PRECOMPUTE_RESULT":
      return (
        typeof value.nodeId === "string" &&
        (value.reply === null || (isRecord(value.reply) && isLabel(value.reply.label)))
      );
    default:
      return false;
  }
}

export function isRolePluginMessage(value: unknown): value is RolePluginMessage {
  return (
    isRecord(value) &&
    [
      "ROLE_STATE",
      "ROLE_PRECOMPUTE_START",
      "ROLE_PRECOMPUTE_ITEM",
      "ROLE_PRECOMPUTE_DONE"
    ].includes(String(value.type))
  );
}
