import {
  DEPTH_WORD_LIMITS,
  type ExplanationKey
} from "../../src/shared/teachMeWhy/explanationTypes";
import type { Rejection } from "../../src/shared/teachMeWhy/validateExplanation";

/** The exact failure, in words the model can act on, appended to the prompt on a retry */
export function retryMessage(key: ExplanationKey, rejection: Rejection): string {
  const limit = DEPTH_WORD_LIMITS[key.depth];
  const quoted = `"${rejection.detail}"`;
  switch (rejection.code) {
    case "too-short":
      return `your last attempt had ${rejection.detail}, the minimum is ${limit.min}`;
    case "too-long":
      return `your last attempt had ${rejection.detail}, the maximum is ${limit.max}`;
    case "fix-wording":
      return `you wrote ${quoted}, but {fix} is a colour and must come directly after "to", "with" or "use", for example "change the text to {fix}"`;
    case "direction-word":
      return `you wrote ${quoted}, but never write darken, darker, lighten or lighter near {foreground}, {background} or {fix}`;
    case "size-fix":
      return `you wrote ${quoted}, but a change of text size or font weight is not the fix, the fix is the colour`;
    case "adverb":
      return `you wrote ${quoted}, but never put an -ly adverb next to {measured}, {required}, {foreground}, {background} or {fix}`;
    case "depth3-opening":
      return `your first sentence was ${quoted}, but the first sentence of depth 3 must contain one of {measured}, {required}, {foreground}, {background} or {fontsize}`;
    case "unknown-slot":
      return `you wrote ${rejection.detail}, but braces are only for the listed placeholders`;
    case "slot-not-allowed":
      return `you wrote ${rejection.detail}, which is allowed in Quick only`;
    case "literal-colour":
    case "literal-size":
      return `you typed ${quoted}, write the placeholder instead of a real colour or size`;
    case "number-not-allowed":
      return `you wrote the number ${rejection.detail}, which is not in the fact you used`;
    case "banned-term":
      return `you wrote the banned term ${quoted}`;
    case "dash":
      return "you wrote an en dash or em dash, use a comma or a full stop";
    case "fact-count":
      return `you used ${rejection.detail}, use exactly one fact`;
    case "fact-not-allowed":
      return `${rejection.detail} is not an allowed fact for this key`;
    case "facts-exclusive":
      return `you used ${rejection.detail}, use only one of them`;
  }
}

export const REPEAT_MESSAGE = (other: number, why: string) =>
  `you repeated depth ${other}'s ${why}, start with a different subject`;
export const MISSING_SLOTS = "Quick must include {measured}, {required} and a {fix} colour";
