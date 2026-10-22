/** One text layer as the check saw it, all plain strings so the report is easy to read and to test */
export interface TextRow {
  id: string;
  name: string;
  visible: boolean;
  charCount: number;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  /** The layer's parents, nearest first, each with its fills */
  chain: string[];
  foreground: string;
  background: string;
  indeterminate: string[];
  sizeClass: string;
  required: number | null;
  measured: number | null;
  verdict: "flagged" | "passes" | "not evaluated";
  /** What it was before shapes behind the text counted, null when counting them changed nothing */
  withoutShapes: { background: string; measured: number | null; verdict: string } | null;
}

export interface CheckData {
  build: { commit: string; dirty: boolean | null; builtAt: string };
  figma: {
    apiVersion: string;
    editorType: string;
    command: string;
    pluginId: string;
    page: string;
    pageCount: number;
  };
  apis: Record<string, boolean>;
  loadAllPages: string;
  writeTest: string;
  stored: { issueCount: number | null; byState: Record<string, number>; study: string };
  selection: string[];
  text: {
    total: number;
    visible: number;
    checked: number;
    flagged: number;
    /** Text layers whose result changes when shapes behind them count */
    changedByShapes: number;
    rows: TextRow[];
  };
  errors: string[];
}

const ratio = (value: number | null) => (value === null ? "none" : value.toFixed(2));

function formatRow(row: TextRow, index: number): string[] {
  const lines = [
    `${index + 1}. ${row.id} "${row.name}" ${row.visible ? "visible" : "HIDDEN"}, ${row.charCount} characters`,
    `   font: ${row.fontSize} px, weight ${row.fontWeight}, style ${row.fontStyle}`,
    `   foreground ${row.foreground}, background ${row.background}`,
    `   size class ${row.sizeClass}, needs ${ratio(row.required)}, measured ${ratio(row.measured)}, verdict: ${row.verdict}`
  ];
  if (row.withoutShapes) {
    const old = row.withoutShapes;
    lines.push(
      `   CHANGED by counting shapes behind the text. Before: background ${old.background}, measured ${ratio(old.measured)}, verdict ${old.verdict}`
    );
  }
  if (row.indeterminate.length > 0)
    lines.push(`   could not be measured because: ${row.indeterminate.join(", ")}`);
  row.chain.forEach((layer, level) => lines.push(`   ${"  ".repeat(level)}inside ${layer}`));
  return lines;
}

/** The whole report as text for a person to paste into a message, no layer words are included */
export function formatReport(data: CheckData, hints: readonly string[], at: string): string {
  const { build, figma, text, stored } = data;
  const out = [
    "CADT detection check",
    `time: ${at}`,
    `build: ${build.commit}${build.dirty ? " (uncommitted changes)" : ""}, built ${build.builtAt}`,
    "",
    "WHAT TO DO NEXT",
    ...(hints.length > 0 ? hints.map((hint) => `- ${hint}`) : ["- Nothing looks wrong here."]),
    "",
    "FIGMA",
    `plugin api ${figma.apiVersion}, editor ${figma.editorType}, command ${figma.command}, plugin id ${figma.pluginId}`,
    `current page "${figma.page}", ${figma.pageCount} page(s)`,
    `functions the plugin needs: ${Object.entries(data.apis)
      .map(([n, ok]) => `${n} ${ok ? "yes" : "MISSING"}`)
      .join(", ")}`,
    `loading all pages: ${data.loadAllPages}`,
    `saving to this file: ${data.writeTest}`,
    "",
    "SAVED BY THE PLUGIN",
    `issue records: ${stored.issueCount === null ? "unreadable" : stored.issueCount} ${JSON.stringify(stored.byState)}`,
    `study session: ${stored.study}`,
    `selection: ${data.selection.length > 0 ? data.selection.join("; ") : "nothing selected"}`,
    "",
    "TEXT ON THIS PAGE",
    `${text.total} text layer(s), ${text.visible} visible, ${text.checked} checked, ${text.flagged} would be flagged now, ${text.changedByShapes} changed by counting shapes behind the text`,
    ...text.rows.flatMap(formatRow)
  ];
  if (data.errors.length > 0)
    out.push("", "ERRORS WHILE CHECKING", ...data.errors.map((e) => `- ${e}`));
  return out.join("\n") + "\n";
}
