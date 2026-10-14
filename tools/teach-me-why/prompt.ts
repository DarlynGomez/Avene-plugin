import { createHash } from "node:crypto";
import {
  DEPTH_WORD_LIMITS,
  type ExplanationKey,
  type Fact
} from "../../src/shared/teachMeWhy/explanationTypes";
import { SITUATIONAL_FRAMES } from "./frames";

/** Bump this with any change to the prompt text, it is recorded in the output file */
export const PROMPT_VERSION = "2";

export const DEPTH_NAMES = { 1: "Quick", 2: "Why it matters", 3: "The idea behind it" } as const;

export const SYSTEM_PROMPT = `You write short explanations for a design tool that tells designers when text is hard to read. Each explanation says why a contrast problem matters and what could be done. The reader is a design student. Be encouraging and plain. Treat the problem as a constraint to work within.

You are given: a key (the role of the text, the severity, the size class and the depth), two ratio placeholders, a word limit, a list of allowed facts, and a list of allowed situations.

Rules:
1. Write the placeholders {measured} and {required} exactly as given, with the braces, wherever you refer to the two ratios. Never write a real ratio.
2. Use only the allowed facts. Do not add any other claim. List the ids of the facts you used, and an empty list if you used none.
3. Use at most one allowed situation, and only if one is listed. Do not invent others.
4. Any number you write must come from a fact you used. Do not write any other number, percentage or ratio.
5. Never write these words: WCAG, AA, AAA, compliance, compliant, violation, success criterion. Never write a criterion number.
6. Say "you could" or "one option is". Never say "you must" or "you should". No blame, no hype, no claims about who the designer's audience is.
7. Put the main point first, then the reason.
8. Low severity must not sound alarming. High severity must not sound hopeless.
9. Stay inside the word limit.
10. Depth Quick: what is wrong, the two ratios, and one direction to try. Depth Why it matters: who is affected and when. Depth The idea behind it: the principle, why the bar is where it is, and several ways to keep the colour, such as darkening the same colour a little, taking a passing colour already in the file, using the colour for larger or bolder text, putting it on a darker surface, or keeping it as an accent with the words in a darker shade. For text over an image: an overlay, a blur, or a shadow or outline.
11. If the role is decorative, say that decoration has no contrast minimum only if the text carries no information, and invite the designer to decide which it is.
12. Use commas, full stops or "and" instead of dashes. Never write an en dash or an em dash.

Reply with JSON only: {"text": "...", "fact_ids": ["F01"]}.`;

/** Everything the model is told about one explanation and nothing more */
export function buildUserMessage(key: ExplanationKey, facts: readonly Fact[]): string {
  const limit = DEPTH_WORD_LIMITS[key.depth];
  const frames = key.depth === 1 ? [] : SITUATIONAL_FRAMES;
  const lines = [
    `Role: ${key.role}`,
    `Severity: ${key.severity}`,
    `Size class: ${key.size}`,
    `Depth: ${key.depth} (${DEPTH_NAMES[key.depth]})`,
    "Measured ratio: {measured}",
    "Required ratio: {required}",
    `Word limit: ${limit.min} to ${limit.max} words`,
    "Allowed facts:",
    ...(facts.length > 0 ? facts.map((fact) => `${fact.id}: ${fact.plain}`) : ["none"]),
    "Allowed situations:",
    ...(frames.length > 0 ? frames.map((frame) => `- ${frame}`) : ["none"])
  ];
  return lines.join("\n");
}

/** A fingerprint of the facts and frames, so a rerun after they change is caught */
export function inputsHash(facts: readonly Fact[]): string {
  const material = JSON.stringify({
    facts: facts.map((f) => [f.id, f.plain]),
    frames: SITUATIONAL_FRAMES
  });
  return createHash("sha256").update(material).digest("hex").slice(0, 16);
}
