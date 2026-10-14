import { parseKeyString } from "../../src/shared/teachMeWhy/explanationKey";
import { sourceNamesFor } from "../../src/shared/teachMeWhy/sourceNames";
import { parseCsv, toCsv } from "./csv";
import type { Progress } from "./types";

export const REVIEW_COLUMNS = [
  "key",
  "depth",
  "text",
  "fact_ids",
  "sources",
  "validation",
  "decision",
  "edited_text",
  "reviewer"
] as const;

/** What a reviewer already entered, kept only while the text they judged is unchanged */
function earlierDecisions(
  previousCsv: string | null
): Map<string, { text: string; cells: string[] }> {
  const kept = new Map<string, { text: string; cells: string[] }>();
  if (!previousCsv) return kept;
  const [header, ...rows] = parseCsv(previousCsv);
  const at = (row: string[], name: string) => row[header.indexOf(name)] ?? "";
  for (const row of rows) {
    const cells = ["decision", "edited_text", "reviewer"].map((name) => at(row, name));
    if (cells.some((cell) => cell !== ""))
      kept.set(at(row, "key"), { text: at(row, "text"), cells });
  }
  return kept;
}

export function reviewCsv(progress: Progress, previousCsv: string | null = null): string {
  const earlier = earlierDecisions(previousCsv);
  const rows = Object.values(progress.items).map((item) => [
    item.key,
    String(parseKeyString(item.key)?.depth ?? ""),
    item.text,
    item.factIds.join(" "),
    sourceNamesFor(item.factIds).join("; "),
    item.status === "completed" ? "ok" : `failed: ${item.reasons.join(", ")}`,
    ...(earlier.get(item.key)?.text === item.text
      ? (earlier.get(item.key)?.cells ?? [])
      : ["", "", ""])
  ]);
  return toCsv([[...REVIEW_COLUMNS], ...rows]);
}

export interface FailureSummary {
  /** Every attempt that was refused, counted by rule, retries included */
  attemptsByReason: Record<string, number>;
  failedItems: number;
  completedItems: number;
  mostFailed: string | null;
}

export function failureSummary(progress: Progress): FailureSummary {
  const attemptsByReason: Record<string, number> = {};
  const items = Object.values(progress.items);
  for (const item of items) {
    for (const attempt of item.attemptReasons) {
      for (const reason of attempt) attemptsByReason[reason] = (attemptsByReason[reason] ?? 0) + 1;
    }
  }
  const ranked = Object.entries(attemptsByReason).sort((a, b) => b[1] - a[1]);
  return {
    attemptsByReason,
    failedItems: items.filter((item) => item.status === "failed").length,
    completedItems: items.filter((item) => item.status === "completed").length,
    mostFailed: ranked[0]?.[0] ?? null
  };
}
