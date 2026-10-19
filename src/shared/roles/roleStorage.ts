import type { RoleInputs } from "./roleInputs";
import { ROLE_LABELS, type RoleLabel } from "./roleLabels";

/** A model suggestion kept on a node, rules are never stored because they are recomputed */
export interface RoleSuggestion {
  label: RoleLabel;
  source: "ai";
  model: string | null;
  /** A researcher has looked at it, a live one is shown without a review */
  reviewed: boolean;
  live: boolean;
  inputKey: string;
  at: string;
}

export type RoleResponse = "confirmed" | "changed" | "unsure";

export interface RoleAnswer {
  role: RoleLabel;
  response: RoleResponse;
  /** What was shown when the participant answered */
  from: "rule" | "ai" | "none";
  at: string;
}

/** The value under the roles key of one node */
export interface RoleData {
  v: 1;
  suggestion?: RoleSuggestion;
  answer?: RoleAnswer;
}

const isLabel = (value: unknown): value is RoleLabel => ROLE_LABELS.includes(value as RoleLabel);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function readSuggestion(value: unknown): RoleSuggestion | undefined {
  if (!isRecord(value) || !isLabel(value.label) || value.source !== "ai") return undefined;
  if (typeof value.inputKey !== "string" || typeof value.reviewed !== "boolean") return undefined;
  return {
    label: value.label,
    source: "ai",
    model: typeof value.model === "string" ? value.model : null,
    reviewed: value.reviewed,
    live: value.live === true,
    inputKey: value.inputKey,
    at: typeof value.at === "string" ? value.at : ""
  };
}

function readAnswer(value: unknown): RoleAnswer | undefined {
  if (!isRecord(value) || !isLabel(value.role)) return undefined;
  if (!["confirmed", "changed", "unsure"].includes(String(value.response))) return undefined;
  const from = value.from === "rule" || value.from === "ai" ? value.from : "none";
  return {
    role: value.role,
    response: value.response as RoleResponse,
    from,
    at: typeof value.at === "string" ? value.at : ""
  };
}

/** A value of another version is read as absent and never migrated silently */
export function parseRoleData(raw: string): RoleData | null {
  if (raw === "") return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data.v !== 1) return null;
    return { v: 1, suggestion: readSuggestion(data.suggestion), answer: readAnswer(data.answer) };
  } catch {
    return null;
  }
}

/** Font size, weight, character count and layer name. Colours are left out, changing colour is the task */
export function inputKeyOf(inputs: RoleInputs): string {
  return [inputs.fontSizePx, inputs.fontWeight, inputs.charCount, inputs.layerName].join("|");
}

/** A stored suggestion that may be shown: it still matches the node, says something, and was reviewed or is live */
export function shownSuggestion(data: RoleData | null, inputKey: string): RoleSuggestion | null {
  const found = data?.suggestion;
  if (!found || found.inputKey !== inputKey || found.label === "unsure") return null;
  return found.reviewed || found.live ? found : null;
}

/** Whether the model has already been asked about this node as it is now, whatever it said */
export function alreadyAsked(data: RoleData | null, inputKey: string): boolean {
  return data?.suggestion?.inputKey === inputKey;
}
