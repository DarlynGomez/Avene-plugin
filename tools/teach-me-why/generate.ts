import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "./client";
import { loadEnvFile, readConfig, TOOL_DIR } from "./env";
import { generateAll } from "./generateAll";
import { taskKeys } from "./taskKeys";
import { fileStore, writeAtomic } from "./progressStore";
import { realClock, TokenWindow } from "./rateLimit";
import { failureSummary, reviewCsv } from "./reviewCsv";

/** Run by hand with vite-node, never imported by the plugin */
async function main(): Promise<void> {
  loadEnvFile();
  const config = readConfig();
  const args = process.argv.slice(2);
  const outAt = args.indexOf("--out");
  const out = outAt >= 0 ? args[outAt + 1] : undefined;
  const onlyTask = args.includes("--task-keys");
  // A run for the task keys never touches the reviewed files, it writes its own set
  if (onlyTask && !out)
    throw new Error("--task-keys needs --out <name>, so review.csv is never overwritten");
  if (out !== undefined && !/^[a-z0-9_]+$/.test(out))
    throw new Error("--out takes letters, digits and underscores");
  const suffix = out ? `_${out}` : "";
  const keys = onlyTask
    ? taskKeys(readFileSync(join(TOOL_DIR, "review_first.txt"), "utf8"))
    : undefined;
  const deps = {
    client: createClient(config),
    model: config.model,
    clock: realClock,
    window: new TokenWindow(10000, 60000, realClock),
    random: Math.random,
    store: fileStore(join(TOOL_DIR, `generated${suffix}.json`)),
    keys,
    log: (line: string) => console.log(line),
    retryFailed: process.argv.includes("--retry-failed")
  };
  const progress = await generateAll(deps);

  const reviewPath = join(TOOL_DIR, `review${suffix}.csv`);
  // Decisions already entered stay with any row whose text did not change
  const previous = existsSync(reviewPath) ? readFileSync(reviewPath, "utf8") : null;
  writeAtomic(reviewPath, reviewCsv(progress, previous));
  const summary = failureSummary(progress);
  writeFileSync(join(TOOL_DIR, `failures${suffix}.json`), JSON.stringify(summary, null, 2) + "\n");

  console.log(`Model: ${progress.header.model}`);
  console.log(
    progress.header.digest
      ? `Digest: ${progress.header.digest}`
      : "The service reports no digest or version. Get it from IT's manifest."
  );
  console.log(`Completed ${summary.completedItems}, failed ${summary.failedItems}`);
  console.log("Refused attempts by rule:", summary.attemptsByReason);
  console.log(`Rule that failed most: ${summary.mostFailed ?? "none"}`);
  console.log(
    `Wrote tools/teach-me-why/review${suffix}.csv, failures${suffix}.json and generated${suffix}.json`
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "The run failed");
  process.exitCode = 1;
});
