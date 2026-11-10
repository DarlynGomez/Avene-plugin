/** The rules for a suggestion, as data so they can be read, changed and tested one row at a time */

export type RuleSeverity = "reject" | "warn";

export type AltRuleId =
  | "empty"
  | "too-long"
  | "line-break"
  | "markdown"
  | "link"
  | "banned-prefix"
  | "file-name"
  | "only-image";

/** A rejected suggestion is dropped, a warned one is shown with a plain line */
export const RULE_SEVERITY: Readonly<Record<AltRuleId, RuleSeverity>> = {
  empty: "reject",
  "too-long": "warn",
  "line-break": "reject",
  markdown: "reject",
  link: "reject",
  "banned-prefix": "reject",
  "file-name": "reject",
  "only-image": "reject"
};

/** Alt text that starts like this tells a listener nothing the screen reader has not already said */
export const BANNED_PREFIXES: readonly string[] = [
  "image of",
  "picture of",
  "photo of",
  "graphic of",
  "icon of"
];

/** A description that is only one of these words says nothing */
export const ONLY_WORDS: readonly string[] = ["image", "picture", "photo", "graphic", "icon"];

export const MARKDOWN_PATTERNS: readonly RegExp[] = [
  /\*\*|__|~~|`/,
  /^\s{0,3}#{1,6}\s/,
  /^\s*[-*+]\s+\S/,
  /^\s*\d+[.)]\s+\S/,
  /^\s*>\s/,
  /!?\[[^\]]*\]\([^)]*\)/
];

export const LINK_PATTERNS: readonly RegExp[] = [
  /https?:\/\//i,
  /\bwww\./i,
  /[\w.+-]+@[\w-]+\.[\w.-]+/,
  /\b[\w-]+\.(?:com|org|net|io|dev|app|co|edu|gov)\b/i
];

/** What a layer name looks like when it is a file and not a name, such as hero.png or IMG_2043 */
export const FILE_NAME_PATTERNS: readonly RegExp[] = [
  /\.(?:png|jpe?g|gif|svg|webp|heic|avif|bmp|tiff?)\b/i,
  /^(?:img|dsc|image|screenshot|photo)[\s_-]?\d+/i
];
