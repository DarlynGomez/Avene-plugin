import { existsSync, readFileSync, writeFileSync } from "node:fs";

import tableData from "../src/shared/teachMeWhy/explanationTable.json";
import type { ExplanationTable } from "../src/shared/teachMeWhy/explanationTypes";
import { buildQuickTable } from "../src/shared/teachMeWhy/quickTable";
import { checkQuickParts, plainWords, type QuickParts } from "../src/shared/teachMeWhy/quickText";

const SOURCE = "docs/study/teach-me-why/TEACH_ME_WHY_QUICK_V3_1.json";
const TABLE = "src/shared/teachMeWhy/explanationTable.json";

/** A reviewer is passed only once the research team has approved the text: --approve NAME */
const flag = process.argv.indexOf("--approve");
const reviewer = flag >= 0 ? (process.argv[flag + 1] ?? null) : null;

if (!existsSync(SOURCE)) {
  console.error(`${SOURCE} is not there, nothing was changed`);
  process.exit(1);
}
const parts = JSON.parse(readFileSync(SOURCE, "utf8")) as QuickParts;
const problems = checkQuickParts(parts);
if (problems.length > 0) {
  console.error(`${problems.length} problems, nothing was changed`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

const table = buildQuickTable(tableData as unknown as ExplanationTable, parts, reviewer);
const counts = Object.keys(parts.keys).map((key) => plainWords(table.entries[key].text));
writeFileSync(TABLE, `${JSON.stringify(table, null, 2)}\n`);
console.log("checks passed: version 3, 42 keys equal the repo depth 1 keys, no text problems");
console.log(`depth 1 words: ${Math.min(...counts)} to ${Math.max(...counts)}`);
console.log(`depth 2 and 3 entries kept: ${Object.keys(table.entries).length - counts.length}`);
console.log(
  reviewer ? `entries approved by ${reviewer}` : "entries written as pending, no reviewer"
);
console.log(`wrote ${TABLE}`);
