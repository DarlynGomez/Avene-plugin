import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TOOL_DIR } from "./env";
import { flagRows } from "./flagCheck";

function main(): void {
  const csv = readFileSync(join(TOOL_DIR, "review.csv"), "utf8");
  const config = JSON.parse(readFileSync(join(TOOL_DIR, "review_flags.json"), "utf8")) as {
    phrases: string[];
  };
  const flags = flagRows(csv, config.phrases);
  for (const flag of flags) console.log(`row ${flag.line} ${flag.key}: ${flag.reasons.join("; ")}`);
  console.log(`${flags.length} rows flagged`);
}

main();
