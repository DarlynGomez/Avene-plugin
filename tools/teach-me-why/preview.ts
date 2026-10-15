import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fillSlots } from "../../src/shared/teachMeWhy/fillSlots";
import { sameHueFix } from "../../src/shared/teachMeWhy/fixColour";
import { keyToString, parseKeyString } from "../../src/shared/teachMeWhy/explanationKey";
import { analyzeTask } from "./coverageLogic";
import { parseCsv } from "./csv";
import { TOOL_DIR } from "./env";
import { parseGroundTruth, type GroundTruthRow } from "./groundTruth";
import { sideBySide } from "./sideBySide";
import { DEPTH_NAMES } from "./prompt";
import type { Progress } from "./types";

/** Read only, old reviewed text beside the new text for the task keys, nothing is written */
function readRows(): GroundTruthRow[] {
  const dir = join(TOOL_DIR, "ground-truth");
  return ["task_A.csv"].flatMap(
    (name) => parseGroundTruth(readFileSync(join(dir, name), "utf8")).rows
  );
}

/** The first task root with this severity and size, its representative row fills both texts */
function sampleFor(rows: GroundTruthRow[], severity: string, size: string) {
  const { coverage } = analyzeTask(
    "A",
    rows.filter((r) => r.task === "A")
  );
  const root = coverage.roots.find((r) => r.key.severity === severity && r.key.size === size);
  const row = rows.find((r) => r.id === root?.representative);
  return root && row ? { root, row } : null;
}

function main(): void {
  const suffix = process.argv.includes("--out")
    ? `_${process.argv[process.argv.indexOf("--out") + 1]}`
    : "_v3";
  const newPath = join(TOOL_DIR, `generated${suffix}.json`);
  if (!existsSync(newPath))
    throw new Error(`There is no generated${suffix}.json yet, run the generation first.`);
  const fresh = JSON.parse(readFileSync(newPath, "utf8")) as Progress;
  const against = process.argv.includes("--against")
    ? `_${process.argv[process.argv.indexOf("--against") + 1]}`
    : "";
  const [header, ...rows] = parseCsv(readFileSync(join(TOOL_DIR, `review${against}.csv`), "utf8"));
  const old = new Map(rows.map((row) => [row[header.indexOf("key")], row]));
  const rowsGt = readRows();

  for (const name of Object.keys(fresh.items).sort()) {
    const key = parseKeyString(name);
    const item = fresh.items[name];
    if (!key) continue;
    const oldRow = old.get(name);
    const edited = oldRow?.[header.indexOf("edited_text")] ?? "";
    const oldText = edited || (oldRow?.[header.indexOf("text")] ?? "(no old row)");
    const decision = oldRow?.[header.indexOf("decision")] || "undecided";
    const sample = sampleFor(rowsGt, key.severity, key.size);
    const fill = (text: string, withDetails: boolean) =>
      sample
        ? fillSlots(
            text,
            sample.root.measured,
            sample.root.required,
            withDetails
              ? {
                  foregroundHex: sample.row.fg.toUpperCase(),
                  backgroundHex: sample.row.bg.toUpperCase(),
                  fontSizePx: sample.row.sizePx,
                  fixHex: sameHueFix(sample.row.fg, sample.row.bg, sample.root.required)
                }
              : undefined
          )
        : text;
    console.log(`\n=== ${keyToString(key)}  (${DEPTH_NAMES[key.depth]}) ===`);
    console.log(
      `${`OLD (${against ? against.slice(1) : "v2"}, review: ${decision})`.padEnd(52)} | NEW (${suffix.slice(1)}, ${item.status}${item.reasons.length ? `: ${item.reasons.join(", ")}` : ""}, facts: ${item.factIds.join(" ") || "none"})`
    );
    for (const line of sideBySide(fill(oldText, against !== ""), fill(item.text, true)))
      console.log(line);
  }
  console.log(
    `\nFilled with the first task root of the same severity and size${rowsGt.length ? "" : ""}. Nothing was written.`
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "The preview failed");
  process.exitCode = 1;
}
