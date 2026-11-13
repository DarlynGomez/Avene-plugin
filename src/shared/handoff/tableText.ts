import type { HandoffTableModel, TableRow } from "./tableTypes";

const COLUMNS = [
  "Element",
  "Location",
  "Measured",
  "Needed",
  "Status",
  "Decision",
  "Decides",
  "Note"
];

const cells = (row: TableRow): string[] =>
  [
    row.element,
    row.location,
    row.measured ?? "",
    row.required ?? "",
    row.status.text,
    row.decision,
    row.decidedBy,
    row.note
  ].map((cell) => (cell === "" ? "-" : cell.replace(/\s*\|\s*/g, "/")));

/** Columns lined up with pipes, so it reads as a table pasted into a ticket or a document */
function textTable(rows: readonly TableRow[]): string[] {
  const body = rows.map(cells);
  const widths = COLUMNS.map((name, i) =>
    Math.max(name.length, ...body.map((cell) => cell[i].length))
  );
  const line = (parts: readonly string[]) =>
    parts
      .map((part, i) => part.padEnd(widths[i]))
      .join(" | ")
      .trimEnd();
  return [line(COLUMNS), widths.map((width) => "-".repeat(width)).join("-|-"), ...body.map(line)];
}

/** The plain text of the model, the same rows the screen shows and nothing that the screen does not */
export function renderTableText(model: HandoffTableModel): string {
  const { header, footer } = model;
  const build = header.buildId ? `, build ${header.buildId}` : "";
  const out = [
    `Accessibility handoff: ${header.fileName}, ${header.screens.join(", ")}`,
    `Made ${header.date}${build}`,
    `${header.counts.rows} ${header.counts.rows === 1 ? "row" : "rows"} in ${header.counts.groups} ${header.counts.groups === 1 ? "group" : "groups"}`
  ];
  if (model.empty) out.push("", model.empty);
  for (const group of model.groups) {
    out.push("", `## ${group.title}`, ...textTable(group.rows));
  }
  out.push("", footer.notCovered, footer.limitation);
  return out.join("\n");
}
