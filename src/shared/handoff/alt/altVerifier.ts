import { ALT_MAX_CHARS } from "./altLimits";
import {
  BANNED_PREFIXES,
  FILE_NAME_PATTERNS,
  LINK_PATTERNS,
  MARKDOWN_PATTERNS,
  ONLY_WORDS,
  RULE_SEVERITY,
  type AltRuleId
} from "./altRuleTables";

export interface AltVerdict {
  /** False when a rejecting rule failed, the suggestion is then dropped */
  ok: boolean;
  /** Every rule that failed, those that only warn included */
  failures: readonly AltRuleId[];
}

const LINE_BREAK = new RegExp("[\\r\\n\\u2028\\u2029]");

const stripEdges = (text: string): string => text.trim().replace(/^["'“‘(]+/, "");

function startsWithLayerName(text: string, layerName: string | undefined): boolean {
  const name = layerName?.trim().toLowerCase();
  if (!name || !FILE_NAME_PATTERNS.some((pattern) => pattern.test(name))) return false;
  const stem = name.replace(/\.[a-z0-9]{2,5}$/, "");
  const start = stripEdges(text).toLowerCase();
  return start.startsWith(name) || (stem.length > 0 && start.startsWith(stem));
}

/**
 * Mechanical checks only, whether a description is any good is for the designer to judge
 * Without a layer name the checks that need one are skipped, as when a saved suggestion is read back
 */
export function verifyAltSuggestion(text: string, layerName?: string): AltVerdict {
  const failures: AltRuleId[] = [];
  const body = text.trim();
  const lower = stripEdges(body).toLowerCase();
  if (body === "") failures.push("empty");
  if (Array.from(body).length > ALT_MAX_CHARS) failures.push("too-long");
  if (LINE_BREAK.test(body)) failures.push("line-break");
  if (MARKDOWN_PATTERNS.some((pattern) => pattern.test(body))) failures.push("markdown");
  if (LINK_PATTERNS.some((pattern) => pattern.test(body))) failures.push("link");
  if (BANNED_PREFIXES.some((prefix) => lower.startsWith(prefix))) failures.push("banned-prefix");
  if (startsWithLayerName(body, layerName)) failures.push("file-name");
  if (ONLY_WORDS.includes(lower.replace(/[.!\s]+$/, ""))) failures.push("only-image");
  return { ok: failures.every((id) => RULE_SEVERITY[id] === "warn"), failures };
}
