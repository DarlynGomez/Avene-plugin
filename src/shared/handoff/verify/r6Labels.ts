import { idsIn, type BlockContext } from "./scan";
import type { Violation } from "./types";

/** The label and owner up to the colon, so a changed owner counts as a changed label */
const LABEL_KEY = /^((?:Detected|Decision|Needs check)(?: \(owner: (?:Dev|PM|Design)\))?): /;

function keyOf(line: string): string | null {
  return LABEL_KEY.exec(line)?.[1] ?? null;
}

/** Ids under each label, sorted, or for filled text just a count of lines per label */
function summarize(lines: readonly string[], filled: boolean): Map<string, string[]> {
  const by = new Map<string, string[]>();
  for (const line of lines) {
    const key = keyOf(line);
    if (key === null) continue;
    by.set(key, [...(by.get(key) ?? []), ...(filled ? ["line"] : idsIn(line))].sort());
  }
  return by;
}

/** R6: every label of the template survives with the same ids, none is added and none changes */
export function checkLabels(sentences: readonly string[], c: BlockContext): Violation[] {
  const out: Violation[] = sentences
    .filter((line) => keyOf(line) === null)
    .map((match): Violation => ({ rule: "R6", detail: "A line with no label", match }));
  const want = summarize(c.templateLines, c.filled);
  const got = summarize(sentences, c.filled);
  for (const key of want.keys()) {
    if (!got.has(key)) out.push({ rule: "R6", detail: "A label was dropped", match: key });
    else if (want.get(key)?.join() !== got.get(key)?.join()) {
      out.push({ rule: "R6", detail: "The ids under a label changed", match: key });
    }
  }
  for (const key of got.keys()) {
    if (!want.has(key)) out.push({ rule: "R6", detail: "A label was added", match: key });
  }
  return out;
}
