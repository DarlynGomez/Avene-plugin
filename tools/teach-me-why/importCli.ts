import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExplanationTable } from "../../src/shared/teachMeWhy/explanationTypes";
import { TOOL_DIR } from "./env";
import { buildTable } from "./importReview";
import { fileStore, writeAtomic } from "./progressStore";

const TABLE_PATH = join(TOOL_DIR, "../../src/shared/teachMeWhy/explanationTable.json");

/** Run by hand with vite-node after review, never imported by the plugin */
function main(): void {
  const progress = fileStore().load();
  if (!progress) throw new Error("There is no generated.json, run the generation first.");
  const csv = readFileSync(join(TOOL_DIR, "review.csv"), "utf8");
  const base = JSON.parse(readFileSync(TABLE_PATH, "utf8")) as ExplanationTable;
  const { model, digest, promptVersion, promptVersions, generatedAt } = progress.header;
  const result = buildTable(csv, base, {
    model,
    digest,
    promptVersion,
    ...(promptVersions ? { promptVersions } : {}),
    generatedAt
  });
  if (!result.ok) {
    console.error(
      `Nothing was written. Fix these rows in review.csv:\n${result.errors.join("\n")}`
    );
    process.exitCode = 1;
    return;
  }
  writeAtomic(TABLE_PATH, JSON.stringify(result.table, null, 2) + "\n");
  console.log(
    `Wrote ${Object.keys(result.table.entries).length} entries (${result.approved} approved, ${result.edited} edited). ` +
      `${result.rejected} rejected use the fixed template, ${result.pending} not yet decided.`
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "The import failed");
  process.exitCode = 1;
}
