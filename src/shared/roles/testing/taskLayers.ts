import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RoleInputs } from "../roleInputs";

const HERE = dirname(fileURLToPath(import.meta.url));
// Read as a file and never imported, the research tool folder is not code the plugin may use
const CSV = join(
  HERE,
  "..",
  "..",
  "..",
  "..",
  "tools",
  "teach-me-why",
  "ground-truth",
  "task_A.csv"
);

/** One text layer of the task file, as the research team recorded it */
export interface GroundTruthRow {
  screen: string;
  id: string;
  text: string;
  sizePx: number;
  weight: number;
  role: string;
}

/** Splits one csv line, a quoted cell may hold commas */
function cells(line: string): string[] {
  const found: string[] = [];
  let current = "";
  let quoted = false;
  for (const character of line) {
    if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      found.push(current);
      current = "";
    } else current += character;
  }
  return [...found, current];
}

/** The real text layers of the Lakeside Cafe task file, screens A1 and A2, with the research team's roles */
export function taskALayers(): GroundTruthRow[] {
  const [header, ...lines] = readFileSync(CSV, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "");
  const names = cells(header);
  return lines.map((line) => {
    const row = cells(line);
    const at = (name: string) => row[names.indexOf(name)] ?? "";
    return {
      screen: at("screen"),
      id: at("id"),
      text: at("text"),
      sizePx: Number(at("size")),
      weight: Number(at("weight")),
      role: at("role")
    };
  });
}

/**
 * The ids in the task file read as paths. The first part is the screen frame, the last is the text
 * layer, and each part between is a frame the layer sits in, so "A1.card1.button.label" is the layer
 * "label" in a frame "button" in a frame "card1" in the screen "A1".
 * Sizes that the file does not hold are assumed and are the same for every layer: a card frame 220
 * tall, a button frame 40 tall and 88 wide, text roughly half its font size wide per character, and
 * every layer in the middle of its screen.
 */
export function inputsFor(row: GroundTruthRow, all: readonly GroundTruthRow[]): RoleInputs {
  const parts = row.id.split(".");
  const names = parts.slice(0, -1).reverse();
  const isButton = names[0] === "button";
  const words = row.text.split(/\s+/).filter((word) => word !== "");
  return {
    fontSizePx: row.sizePx,
    fontWeight: row.weight,
    charCount: row.text.length,
    wordCount: words.length,
    layerName: parts[parts.length - 1],
    autoRename: false,
    parentName: names[0] ?? null,
    ancestorNames: names.slice(0, 3),
    componentName: null,
    parentWidth: isButton ? 88 : 390,
    parentHeight: isButton ? 40 : names[0] === parts[0] ? 800 : 220,
    parentHasSolidFill: true,
    textWidth: Math.round(row.text.length * row.sizePx * 0.5),
    centerXFraction: 0.5,
    centerYFraction: 0.5,
    screenTextCensus: all
      .filter((other) => other.screen === row.screen)
      .map((other) => ({ fontSizePx: other.sizePx, charCount: other.text.length }))
  };
}
