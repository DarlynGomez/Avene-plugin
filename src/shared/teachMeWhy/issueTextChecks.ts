export type IssueTextCode =
  | "fix-wording"
  | "direction-word"
  | "size-fix"
  | "adverb"
  | "depth3-opening"
  | "odd-character"
  | "us-spelling"
  | "meta-phrase";

export interface IssueTextProblem {
  code: IssueTextCode;
  detail: string;
}

const FIX_LEADS = new Set(["to", "with", "use"]);
const DIRECTION = /^(darken\w*|darker|lighten\w*|lighter)$/i;
const NEAR = /\{(?:foreground|background|fix)\}/;
const OPENING_SLOTS = ["{measured}", "{required}", "{foreground}", "{background}", "{fontsize}"];
// Words that change a size, tied to the size slot or to the words text size
const SIZE_VERB = /\b(?:increase|enlarge|bump up|grow)\b/i;
const SIZE_NOUN = /\{fontsize\}|\b(?:text|font)\s+size\b|\bthe size\b/i;
const MAKE_BIGGER = /\bmake\s+(?:it|this|the text|them)\s+(?:a\s+\w+\s+)?(?:bigger|larger)\b/i;
// A change of weight is no more the fix than a change of size
const WEIGHT_CHANGE =
  /\b(?:font\s+weight|(?:the|a|its|text)\s+(?:\w+\s+)?weight|bolder\s+weight|heavier|bold\s+weight|make\s+(?:it|this|the text|them)\s+(?:a\s+\w+\s+)?bolder)\b/i;
const ANY_SLOT = /\{(?:measured|required|foreground|background|fix)\}/;
// Words that end in ly and are not adverbs of manner, only is left alone as it reads plainly
const NOT_ADVERBS = new Set([
  "only",
  "apply",
  "supply",
  "reply",
  "family",
  "daily",
  "early",
  "likely",
  "unlikely",
  "friendly",
  "lovely",
  "weekly",
  "monthly",
  "yearly",
  "assembly",
  "ugly"
]);
const BIGGER_SIZE = /\b(?:bigger|larger)\s+(?:\{fontsize\}|(?:text |font )?size\b)/i;

const stripPunctuation = (word: string) => word.replace(/^[^\w{]+|[^\w}]+$/g, "");

function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence !== "");
}

/** {fix} is a colour, so it follows "to", "with" or "use" and is never a verb */
function fixWording(text: string): IssueTextProblem[] {
  const words = text.split(/\s+/).filter((word) => word !== "");
  const found: IssueTextProblem[] = [];
  words.forEach((word, index) => {
    if (!word.includes("{fix}")) return;
    const before = words[index - 1] ?? "";
    // A word that ends a clause, such as "text.", is not directly followed by the colour
    if (!FIX_LEADS.has(stripPunctuation(before).toLowerCase()) || /[.,;:!?]$/.test(before)) {
      found.push({
        code: "fix-wording",
        detail: words.slice(Math.max(0, index - 2), index + 1).join(" ")
      });
    }
  });
  return found;
}

/** The plugin picks the direction, so no darken or lighten sits close to a colour slot */
function directionWords(text: string): IssueTextProblem[] {
  const words = text.split(/\s+/).filter((word) => word !== "");
  const found: IssueTextProblem[] = [];
  words.forEach((word, index) => {
    if (!NEAR.test(word)) return;
    const from = Math.max(0, index - 4);
    const near = words.slice(from, index + 5);
    const hit = near.find((other) => DIRECTION.test(stripPunctuation(other)));
    if (hit) found.push({ code: "direction-word", detail: near.join(" ") });
  });
  return found;
}

/** A change of size is not offered as the fix for contrast */
function sizeFix(text: string): IssueTextProblem[] {
  return sentencesOf(text)
    .filter(
      (sentence) =>
        (SIZE_VERB.test(sentence) && SIZE_NOUN.test(sentence)) ||
        MAKE_BIGGER.test(sentence) ||
        WEIGHT_CHANGE.test(sentence) ||
        BIGGER_SIZE.test(sentence)
    )
    .map((sentence) => ({ code: "size-fix" as const, detail: sentence }));
}

/** No -ly adverb sits within two words of a ratio or colour slot */
function adverbs(text: string): IssueTextProblem[] {
  const words = text.split(/\s+/).filter((word) => word !== "");
  const found: IssueTextProblem[] = [];
  words.forEach((word, index) => {
    if (!ANY_SLOT.test(word)) return;
    const near = words.slice(Math.max(0, index - 2), index + 3);
    const hit = near.find((other) => {
      const bare = stripPunctuation(other).toLowerCase();
      return (
        bare.length > 3 && bare.endsWith("ly") && !NOT_ADVERBS.has(bare) && !ANY_SLOT.test(other)
      );
    });
    if (hit) found.push({ code: "adverb", detail: near.join(" ") });
  });
  return found;
}

/** The idea behind it starts from this issue, not from the fact alone */
export function depth3Opening(text: string): IssueTextProblem[] {
  const first = sentencesOf(text)[0] ?? "";
  return OPENING_SLOTS.some((slot) => first.includes(slot))
    ? []
    : [{ code: "depth3-opening", detail: first }];
}

/** Rules for any text, the opening rule is for generated text only and is checked by the tool */
export function issueTextProblems(text: string): IssueTextProblem[] {
  return [...fixWording(text), ...directionWords(text), ...sizeFix(text), ...adverbs(text)];
}

const ODD_CHARACTERS: readonly [string, string][] = [
  ["\u2011", "non-breaking hyphen"],
  ["\u2019", "curly apostrophe"],
  ["\u201C", "curly opening quote"],
  ["\u201D", "curly closing quote"]
];
const A_STUDY = /\b(?:a|one|the|in a)\s+study\b/i;

/**
 * Extra rules for text a model wrote or a reviewer edited, the fixed templates are written by a person
 * Plain characters only, US spelling, and no phrase that points at something the text never said
 */
export function generatedTextProblems(text: string): IssueTextProblem[] {
  const found: IssueTextProblem[] = [];
  for (const [character, name] of ODD_CHARACTERS) {
    if (text.includes(character)) found.push({ code: "odd-character", detail: name });
  }
  for (const word of text.match(/\bcolour\w*/gi) ?? []) {
    found.push({ code: "us-spelling", detail: word });
  }
  if (/\bsize class\b/i.test(text)) found.push({ code: "meta-phrase", detail: "size class" });
  const that = /\bthat study\b/i.exec(text);
  if (that && !A_STUDY.test(text.slice(0, that.index))) {
    found.push({ code: "meta-phrase", detail: "that study" });
  }
  return found;
}
