import { createHash } from "node:crypto";
import {
  DEPTH_WORD_LIMITS,
  type ExplanationKey,
  type Fact
} from "../../src/shared/teachMeWhy/explanationTypes";
import { STORY_FACTS } from "../../src/shared/teachMeWhy/factEligibility";

/** Bump this with any change to the prompt text, it is recorded in the output file */
export const PROMPT_VERSION = "6";

export const DEPTH_NAMES = { 1: "Quick", 2: "Why it matters", 3: "The idea behind it" } as const;

export const SYSTEM_PROMPT = `You write short explanations for a design tool that tells designers when text is hard to read. Each explanation says why a contrast problem matters and what could be done. The reader is a design student. Be encouraging and plain. Treat the problem as a constraint to work within.

You are given: a key (the role of the text, the severity, the size class and the depth), the placeholders you may write, a word limit, the size class, and a list of allowed facts. The same issue gets three explanations, one for each depth. They are written one at a time, and a designer may read any one alone or all three in a row.

Rules:
1. Write each placeholder exactly as given, with the braces, wherever you refer to that thing. Never write a real ratio, colour, size or other measurement of your own. Use only the placeholders listed for this depth. Braces are only for those placeholders, never around any other word or phrase.
2. Use only the allowed facts. At depth Quick use none. At depth Why it matters and depth The idea behind it use exactly one, when any is listed. Do not add any other claim. List the id of the fact you used, or an empty list.
3. A fact marked story is one person's account. Present it as a story, for example "One practitioner described", and never as a statistic or as what most people do.
4. A situation, such as reading in bright light, may come only from the one fact you use, and only as that fact states it. Do not invent others. Never write the word glossy.
5. Any number you write must appear word for word in the fact you used. Do not write any other number, percentage or ratio.
6. Never write these words: WCAG, AA, AAA, compliance, compliant, violation, success criterion. Never write a criterion number.
7. Say "you could" or "one option is". Never say "you must" or "you should". No blame, no hype, no claims about who the designer's audience is.
8. Put the main point first, then the reason.
9. Low severity must not sound alarming. High severity must not sound hopeless.
10. Stay inside the word limit. Each placeholder counts as one word toward the minimum, so write enough real words to reach it.
11. Never call normal size text larger text. Mention larger text only when the size class is large.
12. Each depth has its own job and says only that. Quick: what is wrong and the fix in one move. Name the colours and the size with the placeholders, say how far short the ratio falls with {measured} and {required}, and give the fix with {fix}. {fix} is a colour, so write "change the text to {fix}" or the like, with a neutral verb. Never use {fix} as a verb, and put it directly after "to", "with" or "use". Never suggest changing the text size or font weight as the fix, the fix is the colour. Never put an -ly adverb next to a placeholder. Never write darken or lighten next to {foreground}, {background} or {fix}, because the plugin picks the direction. Why it matters: who is affected or the situation, built on the one fact. Do not open with the ratios and do not give the fix. The idea behind it: the principle and the lesson for a designer, built on the one fact, with several routes that keep the colour, such as darkening the same colour a little, taking a passing colour already in the file, using the colour for larger or bolder text (only when the size class is large), putting it on a darker surface, or keeping it as an accent with the words in a darker shade. For text over an image: an overlay, a blur, or a shadow or outline. Do not open with the ratios and do not use {fix}. The first sentence must mention this issue with one of {measured}, {required}, {foreground}, {background} or {fontsize}.
13. The three depths of one issue must not repeat each other. Do not start two of them with the same words, and do not make the same main claim in two of them. A designer reading all three should learn something new from each.
14. If the role is decorative, say that decoration has no contrast minimum only if the text carries no information, and invite the designer to decide which it is.
15. Use commas, full stops or "and" instead of dashes. Never write an en dash or an em dash.

Reply with JSON only: {"text": "...", "fact_ids": ["F01"]}.`;

const SIZE_TEXT = {
  normal: "normal text: below 24px, or below about 18.5px if bold",
  large: "large text: 24px or more, or about 18.5px or more if bold"
} as const;

const QUICK_PLACEHOLDERS = "{foreground} {background} {fontsize} {measured} {required} {fix}";
const OTHER_PLACEHOLDERS = "{foreground} {background} {fontsize} {measured} {required}";

/** Everything the model is told about one explanation and nothing more */
export function buildUserMessage(key: ExplanationKey, facts: readonly Fact[]): string {
  const limit = DEPTH_WORD_LIMITS[key.depth];
  const lines = [
    `Role: ${key.role}`,
    `Severity: ${key.severity}`,
    `Size class: ${SIZE_TEXT[key.size]}`,
    `Depth: ${key.depth} (${DEPTH_NAMES[key.depth]})`,
    `Placeholders you may write: ${key.depth === 1 ? QUICK_PLACEHOLDERS : OTHER_PLACEHOLDERS}`,
    `Word limit: ${limit.min} to ${limit.max} words`,
    "Allowed facts:",
    ...(facts.length > 0
      ? facts.map(
          (fact) => `${fact.id}${STORY_FACTS.has(fact.id) ? " (story)" : ""}: ${fact.plain}`
        )
      : ["none"])
  ];
  return lines.join("\n");
}

/** A fingerprint of the facts, so a rerun after they change is caught */
export function inputsHash(facts: readonly Fact[]): string {
  const material = JSON.stringify({ facts: facts.map((f) => [f.id, f.plain]) });
  return createHash("sha256").update(material).digest("hex").slice(0, 16);
}
