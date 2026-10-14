import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeTask } from "./coverageLogic";
import { coverageCsv, presence, reviewFirst, totals } from "./coverageReport";
import { parseCsv } from "./csv";
import { TOOL_DIR } from "./env";
import { parseGroundTruth } from "./groundTruth";
import { writeAtomic } from "./progressStore";

const GROUND_TRUTH_DIR = join(TOOL_DIR, "ground-truth");

/** Read only on review.csv, no model, no network */
function reviewState(): Map<string, string> {
  const path = join(TOOL_DIR, "review.csv");
  const state = new Map<string, string>();
  if (!existsSync(path)) return state;
  const [header, ...rows] = parseCsv(readFileSync(path, "utf8"));
  for (const row of rows)
    state.set(row[header.indexOf("key")] ?? "", row[header.indexOf("validation")] ?? "");
  return state;
}

function main(): void {
  const files = existsSync(GROUND_TRUTH_DIR)
    ? readdirSync(GROUND_TRUTH_DIR).filter((name) => name.endsWith(".csv"))
    : [];
  if (files.length === 0) {
    console.error(
      `No ground truth csv found. Put the Task A and Task B files in\n  ${GROUND_TRUTH_DIR}\nwith the columns task,screen,id,text,fg,bg,size,weight,role,root.`
    );
    process.exitCode = 1;
    return;
  }
  const parsed = files.map((name) =>
    parseGroundTruth(readFileSync(join(GROUND_TRUTH_DIR, name), "utf8"))
  );
  const errors = parsed.flatMap((p) => p.errors);
  const rows = parsed.flatMap((p) => p.rows);
  const taskNames = [...new Set(rows.map((row) => row.task))];
  const analyses = taskNames.map((task) =>
    analyzeTask(
      task,
      rows.filter((row) => row.task === task)
    )
  );
  errors.push(...analyses.flatMap((a) => a.errors));
  const tasks = analyses.map((a) => a.coverage);

  for (const task of tasks) {
    const ok = task.roots.length === 4 && task.failingInstances === 12;
    console.log(
      `\nTask ${task.task}: ${task.roots.length} roots, ${task.failingInstances} failing instances${ok ? "" : " (expected 4 and 12)"}`
    );
    console.table(
      task.roots.map((r) => ({
        root: r.root,
        instances: r.instances,
        representative: r.representative,
        measured: r.measured.toFixed(2),
        required: r.required,
        role: r.role,
        size: r.key.size,
        severity: r.key.severity,
        key: `${r.key.role}:${r.key.severity}:${r.key.size}`
      }))
    );
    for (const r of task.roots)
      for (const note of r.notes) console.log(`  note, ${r.root}: ${note}`);
  }
  const found = totals(tasks);
  const review = reviewState();
  for (const [task, keys] of Object.entries(found.perTask)) {
    console.log(`\nDistinct keys, task ${task}: ${keys.length}`);
    for (const key of keys) console.log(`  ${key}  needs 3 depth rows (${presence(review, key)})`);
  }
  console.log(
    `\nDistinct keys over both tasks, roles as in the csv: ${found.groundTruth.length} (${found.groundTruth.length * 3} rows)`
  );
  console.log(
    `Distinct keys if no rule decides a role (the plugin today): ${found.asBuilt.length} (${found.asBuilt.length * 3} rows)`
  );
  console.log(
    `Distinct keys if every role can occur: ${found.anyRole.length} (${found.anyRole.length * 3} rows)`
  );
  if (errors.length > 0) console.log(`\nProblems:\n${errors.join("\n")}`);

  writeAtomic(join(TOOL_DIR, "coverage.csv"), coverageCsv(tasks));
  writeAtomic(join(TOOL_DIR, "review_first.txt"), reviewFirst(found));
  console.log("\nWrote coverage.csv and review_first.txt");
}

main();
