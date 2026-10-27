import { canonicalLabel } from "./render";
import type { Audience } from "./types";
import type { Violation } from "./verify/types";
import { verifyEdit } from "./verify/verifyBlock";

export interface EditContext {
  templateLines: readonly string[];
  slots: Readonly<Record<string, string>>;
}

export interface EditResult {
  filled: string[];
  /** Not kept: the hard rules found something */
  blocked: Violation[];
  warnings: Violation[];
}

/** One sentence changed as the designer sees it; a block with a hard violation keeps the old text */
export function applyEdit(
  filled: readonly string[],
  index: number,
  shown: string,
  audience: Audience,
  ctx: EditContext
): EditResult {
  const next = filled.map((line, i) => (i === index ? canonicalLabel(shown, audience) : line));
  const result = verifyEdit(next, ctx);
  if (!result.ok) return { filled: [...filled], blocked: result.blocking, warnings: [] };
  return { filled: next, blocked: [], warnings: result.warnings };
}

export function warningsFor(filled: readonly string[], ctx: EditContext): Violation[] {
  return verifyEdit(filled, ctx).warnings;
}
