import type { HandoffTableModel, TableGroup, TableRow } from "./tableTypes";

const HEAD_CONTRAST = ["Element", "Location", "Contrast", "Status", "Detail"];
const HEAD_ALT = ["Image", "Location", "Status", "Detail"];

const place = (row: TableRow) =>
  [row.location, ...row.details].filter((part) => part !== "").join(" · ");
const contrastText = (row: TableRow) =>
  row.contrast
    ? [row.contrast.measured, row.contrast.required ? `needs ${row.contrast.required}` : ""]
        .filter(Boolean)
        .join(" ")
    : "";

const cleaned = (cell: string) => (cell === "" ? "-" : cell.replace(/\s*\|\s*/g, "/"));

function cellsFor(group: TableGroup, row: TableRow): string[] {
  const parts =
    group.id === "contrast"
      ? [row.element, place(row), contrastText(row), row.status.text, row.detail.text]
      : [row.element, place(row), row.status.text, row.detail.text];
  return parts.map(cleaned);
}

/** Columns lined up with pipes, so it reads as a table pasted into a ticket or a document */
function textTable(group: TableGroup): string[] {
  const head = group.id === "contrast" ? HEAD_CONTRAST : HEAD_ALT;
  const body = group.rows.map((row) => cellsFor(group, row));
  const widths = head.map((name, i) =>
    Math.max(name.length, ...body.map((cell) => cell[i].length))
  );
  const line = (parts: readonly string[]) =>
    parts
      .map((part, i) => part.padEnd(widths[i]))
      .join(" | ")
      .trimEnd();
  return [line(head), widths.map((width) => "-".repeat(width)).join("-|-"), ...body.map(line)];
}

/** The plain text of the model, the same groups, order and fields as the screen and nothing the screen does not show */
export function renderTableText(model: HandoffTableModel): string {
  const { header, footer } = model;
  const out = [
    header.title,
    header.subtitle,
    `${header.counts.needAction} need action, ${header.counts.decided} decided`
  ];
  if (model.empty) out.push("", model.empty);
  for (const group of model.groups) {
    out.push("", `${group.title} (${group.rows.length})`, ...textTable(group));
  }
  out.push("", footer.notCovered);
  if (header.buildId) out.push(`Build ${header.buildId}`);
  return out.join("\n");
}
