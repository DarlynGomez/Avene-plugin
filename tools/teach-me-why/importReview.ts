import { parseKeyString } from "../../src/shared/teachMeWhy/explanationKey";
import type {
  ExplanationEntry,
  ExplanationTable,
  GenerationRecord
} from "../../src/shared/teachMeWhy/explanationTypes";
import { shippableFacts } from "../../src/shared/teachMeWhy/facts";
import { validateExplanation } from "../../src/shared/teachMeWhy/validateExplanation";
import { parseCsv } from "./csv";
import { REVIEW_COLUMNS } from "./reviewCsv";
import { slotsMissing } from "./slotCheck";

export type ImportResult =
  | {
      ok: true;
      table: ExplanationTable;
      approved: number;
      edited: number;
      rejected: number;
      pending: number;
    }
  | { ok: false; errors: string[] };

const SLOT_TOKENS = { measured: "{measured}", required: "{required}" };

/**
 * Turns a reviewed csv into the table, approved and edited rows only
 * Every kept row is checked again, and nothing is written if any row is wrong
 */
export function buildTable(
  csvText: string,
  base: ExplanationTable,
  generation: GenerationRecord
): ImportResult {
  const [header, ...rows] = parseCsv(csvText);
  const missing = REVIEW_COLUMNS.filter((name) => !header?.includes(name));
  if (missing.length > 0) return { ok: false, errors: [`Missing columns: ${missing.join(", ")}`] };
  const at = (row: string[], name: (typeof REVIEW_COLUMNS)[number]) =>
    (row[header.indexOf(name)] ?? "").trim();

  const errors: string[] = [];
  const entries: Record<string, ExplanationEntry> = {};
  const counts = { approved: 0, edited: 0, rejected: 0, pending: 0 };
  rows.forEach((row, index) => {
    const line = index + 2;
    const decision = at(row, "decision").toLowerCase();
    if (decision === "") return void counts.pending++;
    if (decision === "reject") return void counts.rejected++;
    if (decision !== "approve" && decision !== "edit") {
      return void errors.push(`Row ${line}: decision "${decision}" is not approve, edit or reject`);
    }
    const name = at(row, "key");
    const key = parseKeyString(name);
    const text = decision === "edit" ? at(row, "edited_text") : at(row, "text");
    const reviewer = at(row, "reviewer");
    const factIds = at(row, "fact_ids")
      .split(/[\s,;]+/)
      .filter((id) => id !== "");
    if (!key) return void errors.push(`Row ${line}: "${name}" is not a key`);
    if (name in entries) return void errors.push(`Row ${line}: ${name} appears twice`);
    if (text === "") return void errors.push(`Row ${line}: ${name} has no text to ship`);
    if (reviewer === "") return void errors.push(`Row ${line}: ${name} has no reviewer initials`);
    const verdict = validateExplanation({
      text,
      key,
      usedFactIds: factIds,
      allowedFacts: shippableFacts(key),
      slots: SLOT_TOKENS
    });
    const reasons = [
      ...(verdict.ok ? [] : verdict.reasons.map((r) => `${r.code} (${r.detail})`)),
      ...slotsMissing(key, text)
    ];
    if (reasons.length > 0)
      return void errors.push(`Row ${line}: ${name} fails: ${reasons.join(", ")}`);
    entries[name] = { text, status: "approved", reviewer, factIds };
    counts[decision === "edit" ? "edited" : "approved"]++;
  });
  if (errors.length > 0) return { ok: false, errors };
  const sorted = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));
  return { ok: true, table: { generation, fallbacks: base.fallbacks, entries: sorted }, ...counts };
}
