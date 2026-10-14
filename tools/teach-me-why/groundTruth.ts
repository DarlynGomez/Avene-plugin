import { ELEMENT_ROLES, type ElementRole } from "../../src/shared/teachMeWhy/explanationTypes";
import { parseCsv } from "./csv";

export interface GroundTruthRow {
  task: string;
  screen: string;
  id: string;
  text: string;
  fg: string;
  bg: string;
  sizePx: number;
  weight: number;
  role: ElementRole;
  root: string;
}

const COLUMNS = ["task", "screen", "id", "text", "fg", "bg", "size", "weight", "role", "root"];
const ROLE_ALIASES: Record<string, ElementRole> = {
  button: "button text",
  buttontext: "button text"
};

function toRole(value: string): ElementRole | null {
  const name = value.trim().toLowerCase();
  const found = ELEMENT_ROLES.find((role) => role === name);
  return found ?? ROLE_ALIASES[name] ?? null;
}

/** Rows in file order, every unreadable row is reported and none is guessed */
export function parseGroundTruth(csvText: string): { rows: GroundTruthRow[]; errors: string[] } {
  const [header, ...lines] = parseCsv(csvText);
  const missing = COLUMNS.filter((name) => !header?.includes(name));
  if (missing.length > 0) return { rows: [], errors: [`Missing columns: ${missing.join(", ")}`] };
  const rows: GroundTruthRow[] = [];
  const errors: string[] = [];
  lines.forEach((cells, index) => {
    if (cells.every((cell) => cell.trim() === "")) return;
    const at = (name: string) => (cells[header.indexOf(name)] ?? "").trim();
    const role = toRole(at("role"));
    const sizePx = Number(at("size"));
    const weight = Number(at("weight"));
    if (!role)
      return void errors.push(`Row ${index + 2}: role "${at("role")}" is not one of the seven`);
    if (
      !Number.isFinite(sizePx) ||
      !Number.isFinite(weight) ||
      at("size") === "" ||
      at("weight") === ""
    ) {
      return void errors.push(`Row ${index + 2}: size or weight is not a number`);
    }
    rows.push({
      task: at("task"),
      screen: at("screen"),
      id: at("id"),
      text: at("text"),
      fg: at("fg"),
      bg: at("bg"),
      sizePx,
      weight,
      role,
      root: at("root")
    });
  });
  return { rows, errors };
}
