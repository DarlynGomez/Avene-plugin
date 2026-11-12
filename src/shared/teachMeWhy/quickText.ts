import { ELEMENT_ROLES } from "./explanationTypes";

export interface QuickPart {
  headline: string;
  bullets: string[];
}

export interface QuickParts {
  version: number;
  keys: Record<string, QuickPart>;
}

/** The 42 depth 1 keys, one for every role, severity and size */
export const QUICK_KEYS: string[] = ELEMENT_ROLES.flatMap((role) =>
  ["low", "medium", "high"].flatMap((severity) =>
    ["normal", "large"].map((size) => `${role}:${severity}:${size}:1`)
  )
);

/** The stored text, the headline, a blank line, then one bullet per line starting with "- " */
export function composeQuickText(part: QuickPart): string {
  const list = part.bullets.map((bullet) => `- ${bullet}`).join("\n");
  return list === "" ? part.headline : `${part.headline}\n\n${list}`;
}

/** Words as a reader counts them, the list markers are not words */
export function plainWords(text: string): number {
  return text
    .replace(/^- /gm, "")
    .split(/\s+/)
    .filter((word) => word !== "").length;
}

const BANNED_WORDS = /\b(?:wcag|aa|ratio|standard|guideline|level)/i;
const FORBIDDEN_WORDS = /bold|\badjust|\bignore|\bdefer/i;
// Built from character codes so this file holds no dash or curly quote itself
const chars = (...codes: number[]) =>
  new RegExp(`[${codes.map((c) => String.fromCharCode(c)).join("")}]`);
const DASHES = chars(0x2013, 0x2014);
const CURLY_QUOTES = chars(0x2018, 0x2019, 0x201c, 0x201d);
const UK_SPELLING = /colour|grey|behaviour|favour/i;

function problemsInText(key: string, part: QuickPart): string[] {
  const found: string[] = [];
  const all = [part.headline, ...part.bullets].join(" ");
  const flag = (test: boolean, message: string) => {
    if (test) found.push(`${key}: ${message}`);
  };
  flag(/[{}]/.test(all), "has a slot or curly brace");
  flag(/\d/.test(all), "has a digit");
  flag(BANNED_WORDS.test(all), "names a banned word");
  flag(DASHES.test(all), "has an em or en dash");
  flag(CURLY_QUOTES.test(all), "has a curly quote");
  flag(UK_SPELLING.test(all), "has a UK spelling");
  flag(FORBIDDEN_WORDS.test(all), "names bold, Adjust, Ignore or Defer");
  flag(part.bullets.length > 3, "has more than three bullets");
  for (const bullet of part.bullets) {
    flag(bullet.split(/\s+/).length > 18, `has a bullet over 18 words: ${bullet}`);
  }
  for (const sentence of all.split(/(?<=[.!?])\s+/)) {
    flag(sentence.split(/\s+/).length > 30, `has a sentence over 30 words: ${sentence}`);
  }
  return found;
}

function isPart(value: unknown): value is QuickPart {
  const part = value as QuickPart | null;
  return (
    typeof part === "object" &&
    part !== null &&
    typeof part.headline === "string" &&
    Array.isArray(part.bullets) &&
    part.bullets.every((bullet) => typeof bullet === "string")
  );
}

/** Every problem found in the parts file, empty when it can be imported */
export function checkQuickParts(input: unknown): string[] {
  const parts = input as QuickParts | null;
  if (!parts || typeof parts !== "object" || typeof parts.keys !== "object" || !parts.keys) {
    return ["the file has no keys"];
  }
  const problems: string[] = [];
  if (parts.version !== 3) problems.push(`version is ${String(parts.version)}, not 3`);
  const names = Object.keys(parts.keys);
  for (const key of QUICK_KEYS) if (!names.includes(key)) problems.push(`${key}: missing`);
  for (const key of names) if (!QUICK_KEYS.includes(key)) problems.push(`${key}: not a repo key`);
  for (const key of QUICK_KEYS) {
    const part = parts.keys[key];
    if (part === undefined) continue;
    if (isPart(part)) problems.push(...problemsInText(key, part));
    else problems.push(`${key}: needs a headline and a list of bullets`);
  }
  return problems;
}
