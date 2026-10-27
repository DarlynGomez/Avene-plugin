import type { Audience } from "./types";
import type { BlockLines } from "./blockDraft";

export interface DraftServerRequest {
  requestId: string;
  audience: Audience;
  blockId: string;
  lines: string[];
}

export interface DraftServerReply {
  sentences: string[];
  reason: string;
  model: string | null;
  blockId: string;
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MIN_VALUE = 3;

/** True when a value of the document is written out in the lines, which then hold more than ids */
export function leaksValue(
  lines: readonly string[],
  slots: Readonly<Record<string, string>>
): boolean {
  const text = lines.join("\n");
  return Object.values(slots).some(
    (value) =>
      value.length >= MIN_VALUE &&
      new RegExp(`(?<![A-Za-z0-9])${escape(value)}(?![A-Za-z0-9])`, "i").test(text)
  );
}

let counter = 0;

/** The request for one block, or null when sending it could let a value out; the model sees ids only */
export function prepareDraftRequest(
  audience: Audience,
  block: BlockLines,
  slots: Readonly<Record<string, string>>
): DraftServerRequest | null {
  if (leaksValue(block.lines, slots)) return null;
  counter += 1;
  return {
    requestId: `h-${Date.now().toString(36)}-${counter}`,
    audience,
    blockId: block.id,
    lines: [...block.lines]
  };
}

/** Reads the server's answer, anything that is not the shape is a malformed failure */
export function readDraftReply(body: unknown): DraftServerReply {
  const fail = (reason: string): DraftServerReply => ({
    sentences: [],
    reason,
    model: null,
    blockId: ""
  });
  if (!body || typeof body !== "object") return fail("malformed");
  const v = body as Record<string, unknown>;
  const sentences =
    Array.isArray(v.sentences) && v.sentences.every((s) => typeof s === "string")
      ? (v.sentences as string[])
      : null;
  if (sentences === null || typeof v.reason !== "string") return fail("malformed");
  return {
    sentences,
    reason: v.reason,
    model: typeof v.model === "string" ? v.model : null,
    blockId: typeof v.blockId === "string" ? v.blockId : ""
  };
}

/** One plain line for each way a draft can fail, the template text always stays */
export const FALLBACK_LINES: Record<string, string> = {
  refused: "The drafting helper is not running, so the template text stays.",
  timeout: "The drafting helper took too long, so the template text stays.",
  "not-configured": "No drafting model is set up on this computer, so the template text stays.",
  "rate-limited": "The drafting helper is busy. Try again in a minute. The template text stays.",
  "too-large": "That block is too long to draft, so the template text stays.",
  rejected: "The draft did not pass the checks, so the template text stays.",
  values: "That block holds your own words, so it is not sent to be drafted.",
  other: "The drafting helper could not give a usable draft, so the template text stays."
};

export const fallbackLine = (reason: string): string =>
  FALLBACK_LINES[reason] ?? FALLBACK_LINES.other;
