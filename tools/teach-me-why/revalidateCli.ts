import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { TOOL_DIR } from "./env";
import { fileStore, writeAtomic } from "./progressStore";
import { markFailedRows, revalidate } from "./revalidate";

/** No model and no network, checks the rows already made against the rules as they stand now */
function main(): void {
  const at = process.argv.indexOf("--out");
  const suffix = at >= 0 ? `_${process.argv[at + 1]}` : "";
  const store = fileStore(join(TOOL_DIR, `generated${suffix}.json`));
  const progress = store.load();
  if (!progress) throw new Error("There is no generated.json to check.");
  const { progress: next, failed } = revalidate(progress);
  if (failed.size === 0) return void console.log("Every row still passes. Nothing changed.");
  store.save(next);
  const csvPath = join(TOOL_DIR, `review${suffix}.csv`);
  if (existsSync(csvPath)) {
    writeAtomic(csvPath, markFailedRows(readFileSync(csvPath, "utf8"), failed));
  }
  console.log(
    `${failed.size} rows now fail and are marked failed. Rows that pass were not touched.`
  );
  console.log("Run npm run teach:generate -- --retry-failed to redo only those.");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "The check failed");
  process.exitCode = 1;
}
