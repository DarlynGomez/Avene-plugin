import { DEPTH_WORD_LIMITS, type ExplanationKey, type Fact } from "./explanationTypes";
import type { SlotValues } from "./fillSlots";

export type RejectionCode =
  | "fact-not-allowed"
  | "number-not-allowed"
  | "banned-term"
  | "dash"
  | "unknown-slot"
  | "too-short"
  | "too-long";

export interface Rejection {
  code: RejectionCode;
  detail: string;
}

export type Validation = { ok: true } | { ok: false; reasons: readonly Rejection[] };

export interface ValidationInput {
  text: string;
  key: ExplanationKey;
  usedFactIds: readonly string[];
  allowedFacts: readonly Fact[];
  slots: SlotValues;
}

const BANNED_TERMS = [
  "wcag",
  "aa",
  "aaa",
  "compliance",
  "compliant",
  "violation",
  "success\\s+criterion"
];
const BANNED_PATTERNS = BANNED_TERMS.map(
  (term) => new RegExp(`(?<![A-Za-z0-9])${term}(?![A-Za-z0-9])`, "i")
);
// A criterion number reads like 1.4.3
const CRITERION_NUMBER = /(?<![\d.])\d+\.\d+\.\d+(?![\d.])/;
// Ratios first so 4.5:1 is one number, then percentages, then plain numbers
const NUMBER = /\d+(?:\.\d+)?:\d+(?:\.\d+)?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?/g;
// En dash and em dash only, a hyphen inside a word is fine and curly quotes are fine
const DASH = /[\u2013\u2014]/;
const SLOT = /\{([^{}]*)\}/g;

function numbersIn(text: string): string[] {
  return text.match(NUMBER) ?? [];
}

/** Every reason an explanation cannot ship, not only the first */
export function validateExplanation(input: ValidationInput): Validation {
  const reasons: Rejection[] = [];
  const allowedById = new Map(input.allowedFacts.map((fact) => [fact.id, fact]));
  const used: Fact[] = [];
  for (const id of input.usedFactIds) {
    const fact = allowedById.get(id);
    if (fact) used.push(fact);
    else reasons.push({ code: "fact-not-allowed", detail: id });
  }

  let body = input.text;
  for (const match of input.text.matchAll(SLOT)) {
    if (match[1] !== "measured" && match[1] !== "required") {
      reasons.push({ code: "unknown-slot", detail: match[0] });
    }
  }
  body = body.replace(SLOT, " ");

  const permitted = new Set<string>([input.slots.measured, input.slots.required]);
  for (const fact of used) {
    for (const value of numbersIn(fact.plain)) permitted.add(value);
  }
  for (const value of new Set(numbersIn(body))) {
    if (!permitted.has(value)) reasons.push({ code: "number-not-allowed", detail: value });
  }

  BANNED_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(input.text))
      reasons.push({ code: "banned-term", detail: BANNED_TERMS[index].replace("\\s+", " ") });
  });
  if (CRITERION_NUMBER.test(input.text)) {
    reasons.push({ code: "banned-term", detail: "criterion number" });
  }

  if (DASH.test(input.text)) reasons.push({ code: "dash", detail: "en dash or em dash" });

  const words = input.text.split(/\s+/).filter((word) => word !== "").length;
  const limits = DEPTH_WORD_LIMITS[input.key.depth];
  if (words < limits.min) reasons.push({ code: "too-short", detail: `${words} words` });
  if (words > limits.max) reasons.push({ code: "too-long", detail: `${words} words` });

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}
