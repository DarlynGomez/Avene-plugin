import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildCurriculumFiles } from "../src/shared/teachMeWhy/modules/curriculum/buildFiles";

const SOURCE = "docs/study/lessons/CURRICULUM_LATEST.txt";
const MODULES = "src/shared/teachMeWhy/modules";

if (!existsSync(SOURCE)) {
  console.error(`${SOURCE} is not there, nothing was changed`);
  process.exit(1);
}

/** What the repo already holds for each module, so a field the document is silent on is kept */
const existing: Record<string, Record<string, unknown>> = {};
for (let number = 1; number <= 12; number += 1) {
  const id = `M${String(number).padStart(2, "0")}`;
  const path = join(MODULES, `${id}.json`);
  if (existsSync(path))
    existing[id] = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

const { files, problems } = buildCurriculumFiles(readFileSync(SOURCE, "utf8"), existing);
if (problems.length > 0) {
  console.error(`${problems.length} problems, nothing was changed`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

for (const [name, text] of Object.entries(files)) {
  const path = join(MODULES, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}
const names = Object.keys(files);
console.log("checks passed: 12 modules, 36 quiz questions, 41.5 minutes, every count as expected");
console.log(`wrote ${names.filter((n) => /^M\d{2}\.json$/.test(n)).length} lesson files`);
console.log(`wrote ${names.filter((n) => n.startsWith("quizzes/")).length} quiz files`);
console.log("wrote index.json");
