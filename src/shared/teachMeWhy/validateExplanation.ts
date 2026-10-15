import { exclusiveViolations } from "./factEligibility";
import { DEPTH_WORD_LIMITS, type ExplanationKey, type Fact } from "./explanationTypes";
import type { SlotValues } from "./fillSlots";
import { issueTextProblems, type IssueTextCode } from "./issueTextChecks";

export type RejectionCode =
  | "fact-not-allowed"
  | "facts-exclusive"
  | "fact-count"
  | "number-not-allowed"
  | "banned-term"
  | "dash"
  | "unknown-slot"
  | "slot-not-allowed"
  | "literal-color"
  | "literal-size"
  | "too-short"
  | "too-long"
  | IssueTextCode;

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
  "success\\s+criterion",
  "glossy"
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
// Colours and sizes belong in slots only, the model never types one
const HEX_COLOUR = /#[0-9A-Fa-f]{3,8}(?![0-9A-Za-z])/;
const LENGTH = /\d+(?:\.\d+)?\s*(?:px|pt|rem|em)\b/i;
const SLOT_NAMES = ["measured", "required", "foreground", "background", "fontsize"];
/** The fix colour belongs to the quick explanation only */
const QUICK_ONLY_SLOTS = ["fix"];

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

  // Depths 2 and 3 are built on exactly one fact whenever the row offers any
  if (input.key.depth !== 1 && input.allowedFacts.length > 0 && input.usedFactIds.length !== 1) {
    reasons.push({ code: "fact-count", detail: `${input.usedFactIds.length} facts used` });
  }
  for (const group of exclusiveViolations(input.usedFactIds)) {
    reasons.push({ code: "facts-exclusive", detail: group.join(" and ") });
  }

  for (const match of input.text.matchAll(SLOT)) {
    const name = match[1];
    if (QUICK_ONLY_SLOTS.includes(name)) {
      if (input.key.depth !== 1) reasons.push({ code: "slot-not-allowed", detail: match[0] });
    } else if (!SLOT_NAMES.includes(name)) {
      reasons.push({ code: "unknown-slot", detail: match[0] });
    }
  }
  const body = input.text.replace(SLOT, " ");
  const hex = HEX_COLOUR.exec(body);
  if (hex) reasons.push({ code: "literal-color", detail: hex[0] });
  const length = LENGTH.exec(body);
  if (length) reasons.push({ code: "literal-size", detail: length[0] });

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

  reasons.push(...issueTextProblems(input.text));

  const words = input.text.split(/\s+/).filter((word) => word !== "").length;
  const limits = DEPTH_WORD_LIMITS[input.key.depth];
  if (words < limits.min) reasons.push({ code: "too-short", detail: `${words} words` });
  if (words > limits.max) reasons.push({ code: "too-long", detail: `${words} words` });

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}
