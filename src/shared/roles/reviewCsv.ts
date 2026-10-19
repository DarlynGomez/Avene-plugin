import { cell } from "./roleReport";

/** One stored suggestion as the researcher reviews it, layer names only and never any characters */
export interface ReviewRow {
  screen: string;
  layerName: string;
  nodeId: string;
  modelLabel: string;
  model: string;
  reviewed: string;
  inputKey: string;
  finalLabel: string;
  note: string;
}

const COLUMNS: readonly { header: string; key: keyof ReviewRow }[] = [
  { header: "screen", key: "screen" },
  { header: "layer name", key: "layerName" },
  { header: "node id", key: "nodeId" },
  { header: "model label", key: "modelLabel" },
  { header: "model", key: "model" },
  { header: "reviewed", key: "reviewed" },
  { header: "input key", key: "inputKey" },
  { header: "final label", key: "finalLabel" },
  { header: "note", key: "note" }
];

export function reviewCsv(rows: readonly ReviewRow[]): string {
  const lines = rows.map((row) => COLUMNS.map((c) => cell(row[c.key])).join(","));
  return [COLUMNS.map((c) => c.header).join(","), ...lines].join("\n") + "\n";
}

/** Fields and rows of a CSV, a quoted field may hold commas, doubled quotes and line breaks */
function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') field += char;
      else if (text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || row.length > 0) rows.push([...row, field]);
  return rows;
}

/** Columns are found by header, so a spreadsheet that reorders or drops the empty note still imports. Null when the header is not ours */
export function parseReviewCsv(text: string): ReviewRow[] | null {
  const [header, ...body] = splitCsv(text.replace(/^\uFEFF/, ""));
  if (!header) return null;
  const names = header.map((h) => h.trim().toLowerCase());
  const index = COLUMNS.map((c) => names.indexOf(c.header));
  const required = ["node id", "reviewed", "input key", "final label"];
  if (required.some((name) => !names.includes(name))) return null;
  return body
    .filter((fields) => fields.some((f) => f !== ""))
    .map((fields) => {
      const row = {} as Record<keyof ReviewRow, string>;
      COLUMNS.forEach((c, at) => {
        row[c.key] = index[at] >= 0 ? (fields[index[at]] ?? "") : "";
      });
      return row;
    });
}
