import type { PdfStruct } from "pdfkit";

import type { TableRow } from "../tableTypes";
import { CONTENT_WIDTH, drawText, heightOf, leaf, node, PAGE, type Ctx } from "./pdfDraw";
import { BODY, GAP, innerWidth, PAD, SMALL, type Columns } from "./pdfLayout";

export interface Line {
  text: string;
  size: number;
  quiet: boolean;
}

/** The lines across the row under the main one: the detail, then each note in the order it was given */
export function detailLines(row: TableRow): Line[] {
  return [
    ...(row.detail ? [{ text: row.detail.text, size: BODY, quiet: row.detail.muted }] : []),
    ...row.notes.map((n) => ({
      text: n.text,
      size: n.tone === "quiet" ? SMALL : BODY,
      quiet: n.tone === "quiet"
    }))
  ];
}

export function drawDetailRow(c: Ctx, table: PdfStruct, cols: Columns, lines: Line[]): void {
  const width = CONTENT_WIDTH - 2 * PAD;
  node(c, table, "TR", {}, (tr) => {
    node(
      c,
      tr,
      "TD",
      {},
      (td) => {
        let y = c.y;
        for (const line of lines) {
          const at = y;
          const color = line.quiet ? c.theme.muted : c.theme.ink;
          leaf(c, td, "P", () =>
            drawText(c, "Body", line.size, color, line.text, PAGE.margin + PAD, at, width)
          );
          y += heightOf(c, "Body", line.size, line.text, width) + GAP;
        }
      },
      { O: "Table", ColSpan: cols.x.length }
    );
  });
}

export interface ItemSize {
  /** The height of the main row and of the lines under it, with the padding around them */
  main: number;
  detail: number;
  total: number;
}

export function sizeOf(
  c: Ctx,
  cols: Columns,
  row: TableRow,
  facts: string,
  lines: Line[]
): ItemSize & { nameH: number } {
  const w0 = innerWidth(cols, 0);
  const nameH = heightOf(c, "Bold", BODY, row.element, w0);
  const whereH = facts ? heightOf(c, "Body", SMALL, facts, w0) : 0;
  const needsH = row.contrast?.required ? SMALL * 1.3 : 0;
  const main = Math.max(nameH + whereH, BODY * 1.3 + needsH) + PAD;
  const detail = lines.reduce(
    (sum, l) => sum + heightOf(c, "Body", l.size, l.text, CONTENT_WIDTH - 2 * PAD) + GAP,
    0
  );
  return { main, detail, total: main + detail + PAD, nameH };
}
