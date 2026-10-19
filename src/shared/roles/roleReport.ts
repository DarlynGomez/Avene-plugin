/** One text node of the precompute report, no participant data and no characters */
export interface ReportRow {
  screen: string;
  layerName: string;
  nodeId: string;
  /** rule, ai, or none when nothing was decided or the request failed */
  by: "rule" | "ai" | "none";
  label: string;
  reasonOrFailure: string;
  reviewed: boolean;
}

const COLUMNS = [
  "screen",
  "layer name",
  "node id",
  "decided by",
  "label",
  "reason or failure",
  "reviewed"
];

function cell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function reportCsv(rows: readonly ReportRow[]): string {
  const lines = rows.map((row) =>
    [
      row.screen,
      row.layerName,
      row.nodeId,
      row.by,
      row.label,
      row.reasonOrFailure,
      row.reviewed ? "yes" : "no"
    ]
      .map(cell)
      .join(",")
  );
  return [COLUMNS.join(","), ...lines].join("\n") + "\n";
}
