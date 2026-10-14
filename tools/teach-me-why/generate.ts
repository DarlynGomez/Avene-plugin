import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "./client";
import { loadEnvFile, readConfig, TOOL_DIR } from "./env";
import { generateAll } from "./generateAll";
import { fileStore, writeAtomic } from "./progressStore";
import { realClock, TokenWindow } from "./rateLimit";
import { failureSummary, reviewCsv } from "./reviewCsv";

/** Run by hand with vite-node, never imported by the plugin */
async function main(): Promise<void> {
  loadEnvFile();
  const config = readConfig();
  const deps = {
    client: createClient(config),
    model: config.model,
    clock: realClock,
    window: new TokenWindow(10000, 60000, realClock),
    random: Math.random,
    store: fileStore(),
    log: (line: string) => console.log(line),
    retryFailed: process.argv.includes("--retry-failed")
  };
  const progress = await generateAll(deps);

  const reviewPath = join(TOOL_DIR, "review.csv");
  // Decisions already entered stay with any row whose text did not change
  const previous = existsSync(reviewPath) ? readFileSync(reviewPath, "utf8") : null;
  writeAtomic(reviewPath, reviewCsv(progress, previous));
  const summary = failureSummary(progress);
  writeFileSync(join(TOOL_DIR, "failures.json"), JSON.stringify(summary, null, 2) + "\n");

  console.log(`Model: ${progress.header.model}`);
  console.log(
    progress.header.digest
      ? `Digest: ${progress.header.digest}`
      : "The service reports no digest or version. Get it from IT's manifest."
  );
  console.log(`Completed ${summary.completedItems}, failed ${summary.failedItems}`);
  console.log("Refused attempts by rule:", summary.attemptsByReason);
  console.log(`Rule that failed most: ${summary.mostFailed ?? "none"}`);
  console.log("Wrote tools/teach-me-why/review.csv and failures.json");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "The run failed");
  process.exitCode = 1;
});
