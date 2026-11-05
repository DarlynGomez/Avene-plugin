import { verifyAltSuggestion } from "./altVerifier";
import type { AltRuleId } from "./altRuleTables";

export type SuggestionKind = "describe" | "decorative" | "unsure";

/** What the server says, read strictly so a wrong shape is a failure with a reason and not a crash */
export interface AltServerReply {
  kind: SuggestionKind;
  text: string;
  reason: string;
  model: string | null;
  ms: number;
}

export interface AltServerRequest {
  requestId: string;
  image: string;
  width: number;
  height: number;
}

const KINDS: readonly SuggestionKind[] = ["describe", "decorative", "unsure"];

export function readAltReply(body: unknown): AltServerReply {
  const value = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const kind = KINDS.find((candidate) => candidate === value.kind);
  const ok = value.reason === "ok" && kind !== undefined;
  return {
    kind: ok ? kind : "unsure",
    text: ok && typeof value.text === "string" ? value.text : "",
    reason: typeof value.reason === "string" ? value.reason : "malformed",
    model: typeof value.model === "string" ? value.model : null,
    ms: typeof value.ms === "number" ? value.ms : 0
  };
}

/** What the designer is shown, the same whether it came from the model just now or from the saved ones */
export type SuggestionOutcome =
  | { status: "describe"; text: string; warnings: readonly AltRuleId[] }
  | { status: "decorative" }
  | { status: "none"; reason: string };

/** Drops what fails a rejecting rule, so no model text reaches the screen for a suggestion that did not pass */
export function outcomeOf(
  kind: SuggestionKind,
  text: string,
  layerName: string | undefined
): SuggestionOutcome {
  if (kind === "decorative") return { status: "decorative" };
  if (kind === "unsure") return { status: "none", reason: "unsure" };
  const verdict = verifyAltSuggestion(text, layerName);
  if (!verdict.ok) return { status: "none", reason: "rejected" };
  return { status: "describe", text: text.trim(), warnings: verdict.failures };
}

export function outcomeOfReply(reply: AltServerReply, layerName: string | undefined) {
  return reply.reason === "ok"
    ? outcomeOf(reply.kind, reply.text, layerName)
    : ({ status: "none", reason: reply.reason } as const);
}
