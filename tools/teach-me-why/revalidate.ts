import { parseKeyString } from "../../src/shared/teachMeWhy/explanationKey";
import { eligibleFacts } from "../../src/shared/teachMeWhy/factEligibility";
import { parseCsv, toCsv } from "./csv";
import { textMessages, textReasons } from "./generateItem";
import type { Progress } from "./types";

/** Items that pass today's rules but did not before are left alone, only failures change */
export function revalidate(progress: Progress): {
  progress: Progress;
  failed: Map<string, string[]>;
} {
  const failed = new Map<string, string[]>();
  const items = { ...progress.items };
  for (const [name, item] of Object.entries(progress.items)) {
    const key = parseKeyString(name);
    if (item.status !== "completed" || !key) continue;
    const reasons = textReasons(key, eligibleFacts(key), item.text, item.factIds);
    if (reasons.length === 0) continue;
    failed.set(name, reasons);
    const messages = textMessages(key, eligibleFacts(key), item.text, item.factIds);
    items[name] = { ...item, status: "failed", reasons, messages };
  }
  return { progress: { ...progress, items }, failed };
}

/** Only the validation cell of a newly failing row changes, every other cell is kept as it is */
export function markFailedRows(csvText: string, failed: ReadonlyMap<string, string[]>): string {
  const [header, ...rows] = parseCsv(csvText);
  const keyAt = header.indexOf("key");
  const validationAt = header.indexOf("validation");
  const marked = rows.map((row) => {
    const reasons = failed.get(row[keyAt] ?? "");
    if (!reasons) return row;
    const next = [...row];
    next[validationAt] = `failed: ${reasons.join(", ")}`;
    return next;
  });
  return toCsv([header, ...marked]);
}
