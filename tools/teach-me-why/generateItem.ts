import type { ExplanationKey, Fact } from "../../src/shared/teachMeWhy/explanationTypes";
import { keyToString } from "../../src/shared/teachMeWhy/explanationKey";
import {
  validateExplanation,
  type Rejection
} from "../../src/shared/teachMeWhy/validateExplanation";
import type { CompletionReply, GenAiClient } from "./client";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import { depth3Opening, generatedTextProblems } from "../../src/shared/teachMeWhy/issueTextChecks";
import { MISSING_SLOTS, retryMessage } from "./retryMessage";
import { fixMissing, slotsMissing } from "./slotCheck";
import type { ItemResult } from "./types";

export const MAX_RETRIES = 2;
const BASE_SEED = 7;
const BASE_MAX_TOKENS = 1500;
const SLOT_TOKENS = { measured: "{measured}", required: "{required}" };

function schemaFor(key: ExplanationKey): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      text: { type: "string" },
      fact_ids: {
        type: "array",
        items: { type: "string" },
        ...(key.depth === 1 ? { maxItems: 0 } : {})
      }
    },
    required: ["text", "fact_ids"],
    additionalProperties: false
  };
}

function parse(content: string): { text: string; factIds: string[] } | null {
  try {
    const data = JSON.parse(content) as { text?: unknown; fact_ids?: unknown };
    if (typeof data.text !== "string" || !Array.isArray(data.fact_ids)) return null;
    if (!data.fact_ids.every((id) => typeof id === "string")) return null;
    return { text: data.text.trim(), factIds: data.fact_ids as string[] };
  } catch {
    return null;
  }
}

/** Every rule an explanation text has to pass, used for new replies and for rows already made */
export function textProblems(
  key: ExplanationKey,
  facts: readonly Fact[],
  text: string,
  factIds: readonly string[]
): Rejection[] {
  const verdict = validateExplanation({
    text,
    key,
    usedFactIds: factIds,
    allowedFacts: facts,
    slots: SLOT_TOKENS
  });
  const opening = key.depth === 3 ? depth3Opening(text) : [];
  return [...(verdict.ok ? [] : verdict.reasons), ...opening, ...generatedTextProblems(text)];
}

export function textReasons(
  key: ExplanationKey,
  facts: readonly Fact[],
  text: string,
  factIds: readonly string[]
): string[] {
  const reasons = [
    ...textProblems(key, facts, text, factIds).map((reason) => reason.code),
    ...slotsMissing(key, text),
    ...fixMissing(key, text)
  ];
  return [...new Set(reasons)];
}

/** The messages for a row, one per failure, for the next attempt */
export function textMessages(
  key: ExplanationKey,
  facts: readonly Fact[],
  text: string,
  factIds: readonly string[]
): string[] {
  const missing = [...slotsMissing(key, text), ...fixMissing(key, text)].length > 0;
  return [
    ...textProblems(key, facts, text, factIds).map((reason) => retryMessage(key, reason)),
    ...(missing ? [MISSING_SLOTS] : [])
  ];
}

/** Judges one reply, an empty reply that ran out of room is its own failure and not a schema one */
export function judge(
  key: ExplanationKey,
  facts: readonly Fact[],
  reply: CompletionReply
): { text: string; factIds: string[]; reasons: string[]; messages: string[] } {
  if (reply.content.trim() === "" && reply.finishReason === "length") {
    return {
      text: "",
      factIds: [],
      reasons: ["empty-length"],
      messages: ["your last reply ran out of room, write a shorter text"]
    };
  }
  const parsed = parse(reply.content);
  if (!parsed)
    return {
      text: "",
      factIds: [],
      reasons: ["schema"],
      messages: ["your last reply was not the JSON asked for"]
    };
  return {
    ...parsed,
    reasons: textReasons(key, facts, parsed.text, parsed.factIds),
    messages: textMessages(key, facts, parsed.text, parsed.factIds)
  };
}

/** What the last attempt got wrong, appended word for word so the model can correct it */
function withFailures(user: string, messages: readonly string[]): string {
  return messages.length === 0
    ? user
    : `${user}\nYour last attempt failed: ${messages.join("; ")}. Write it again and fix this.`;
}

/** At most two retries, each with its own fixed seed so a rerun reproduces every attempt */
export async function generateItem(
  key: ExplanationKey,
  facts: readonly Fact[],
  send: GenAiClient["complete"],
  beforeSend: (estimate: number) => Promise<(actual: number) => void>,
  prior: readonly string[] = []
): Promise<ItemResult> {
  const base = buildUserMessage(key, facts);
  let user = withFailures(base, prior);
  const attemptReasons: string[][] = [];
  let last = {
    text: "",
    factIds: [] as string[],
    reasons: [] as string[],
    messages: [] as string[]
  };
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const maxTokens =
      BASE_MAX_TOKENS + 1000 * attemptReasons.filter((r) => r[0] === "empty-length").length;
    const settle = await beforeSend(
      Math.ceil((SYSTEM_PROMPT.length + user.length) / 3) + maxTokens
    );
    const reply = await send({
      system: SYSTEM_PROMPT,
      user,
      seed: BASE_SEED + attempt,
      maxTokens,
      schema: schemaFor(key)
    });
    settle(reply.totalTokens);
    last = judge(key, facts, reply);
    if (last.reasons.length === 0) {
      return {
        key: keyToString(key),
        status: "completed",
        ...last,
        attemptReasons,
        attempts: attempt + 1
      };
    }
    attemptReasons.push(last.reasons);
    user = withFailures(base, last.messages);
  }
  return {
    key: keyToString(key),
    status: "failed",
    ...last,
    attemptReasons,
    attempts: MAX_RETRIES + 1
  };
}
