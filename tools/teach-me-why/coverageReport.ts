import { keyToString } from "../../src/shared/teachMeWhy/explanationKey";
import type { ExplanationKey } from "../../src/shared/teachMeWhy/explanationTypes";
import { distinctKeys, reviewRowKeys, type RootCoverage, type TaskCoverage } from "./coverageLogic";
import { toCsv } from "./csv";

const bare = (key: ExplanationKey) => keyToString({ ...key, depth: 1 }).replace(/:1$/, "");

export interface Totals {
  /** The plugin as built, no rule decides a role so every root is unknown */
  asBuilt: string[];
  /** The roles in the csv, as a rule or a confirmation would give them */
  groundTruth: string[];
  /** Any of the seven roles for every root */
  anyRole: string[];
  perTask: Record<string, string[]>;
}

export function totals(tasks: readonly TaskCoverage[]): Totals {
  const roots = tasks.flatMap((task) => task.roots);
  const asBuilt = distinctKeys(roots.map((r) => ({ ...r.key, role: r.ruleRole ?? "unknown" })));
  const perTask: Record<string, string[]> = {};
  for (const task of tasks) perTask[task.task] = distinctKeys(task.roots.map((r) => r.key));
  return {
    asBuilt,
    groundTruth: distinctKeys(roots.map((r) => r.key)),
    anyRole: distinctKeys(roots.flatMap((r) => r.anyRoleKeys)),
    perTask
  };
}

export function coverageCsv(tasks: readonly TaskCoverage[]): string {
  const header = [
    "task",
    "root",
    "instances",
    "representative",
    "measured",
    "required",
    "role",
    "rule_role",
    "size",
    "severity",
    "key",
    "notes"
  ];
  const rows = tasks.flatMap((task) =>
    task.roots.map((r: RootCoverage) => [
      r.task,
      r.root,
      String(r.instances),
      r.representative,
      r.measured.toFixed(2),
      String(r.required),
      r.role,
      r.ruleRole ?? "none",
      r.key.size,
      r.key.severity,
      bare(r.key),
      r.notes.join("; ")
    ])
  );
  return toCsv([header, ...rows]);
}

export function reviewFirst(totalsFound: Totals): string {
  return reviewRowKeys(totalsFound.groundTruth).join("\n") + "\n";
}

/** Rows in review.csv for a bare key, with how many of them passed generation */
export function presence(reviewKeys: ReadonlyMap<string, string>, name: string): string {
  const found = [1, 2, 3].filter((depth) => reviewKeys.has(`${name}:${depth}`));
  const ok = found.filter((depth) => reviewKeys.get(`${name}:${depth}`) === "ok");
  return `${found.length} of 3 in review.csv, ${ok.length} ok`;
}
