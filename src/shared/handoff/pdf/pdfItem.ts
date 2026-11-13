import type { PdfStruct } from "pdfkit";

import type { TableRow } from "../tableTypes";
import { BOTTOM, drawText, heightOf, leaf, newPage, node, type Ctx } from "./pdfDraw";
import { BODY, innerWidth, PAD, SMALL, type Columns } from "./pdfLayout";
import { detailLines, drawDetailRow, sizeOf } from "./pdfDetail";
import { drawRule, drawShape } from "./pdfShape";

function drawMainRow(
  c: Ctx,
  table: PdfStruct,
  cols: Columns,
  row: TableRow,
  top: number,
  facts: string,
  nameH: number
): void {
  const { theme } = c;
  const w0 = innerWidth(cols, 0);
  const last = cols.x.length - 1;
  const { status } = row;
  const font = status.needsAction ? "Bold" : "Body";
  node(c, table, "TR", {}, (tr) => {
    leaf(
      c,
      tr,
      "TH",
      () => {
        drawText(c, "Bold", BODY, theme.ink, row.element, cols.x[0] + PAD, top, w0);
        if (facts) drawText(c, "Body", SMALL, theme.muted, facts, cols.x[0] + PAD, top + nameH, w0);
      },
      { scope: "Row" }
    );
    if (cols.contrast) {
      leaf(c, tr, "TD", () => {
        drawText(
          c,
          "Bold",
          BODY,
          theme.ink,
          row.contrast?.measured ?? "",
          cols.x[1] + PAD,
          top,
          innerWidth(cols, 1)
        );
        if (row.contrast?.required) {
          const needs = `needs ${row.contrast.required}`;
          drawText(
            c,
            "Body",
            SMALL,
            theme.muted,
            needs,
            cols.x[1] + PAD,
            top + BODY * 1.3,
            innerWidth(cols, 1)
          );
        }
      });
    }
    leaf(c, tr, "TD", () => {
      const color = status.needsAction ? theme.ink : theme.muted;
      drawText(
        c,
        font,
        BODY,
        color,
        status.text,
        cols.x[last] + PAD,
        top,
        innerWidth(cols, last),
        "right"
      );
    });
  });
  const lineH = heightOf(c, font, BODY, status.text, 200);
  c.doc.font(font).fontSize(BODY);
  const wordWidth = c.doc.widthOfString(c.clean(status.text));
  drawShape(
    c,
    status.kind,
    cols.x[last] + cols.w[last] - PAD - wordWidth - 10,
    top + (lineH - 9) / 2
  );
}

/** One item as two rows, moved whole to the next page when it would not fit, and the page it landed on is reported */
export function drawItem(
  c: Ctx,
  table: PdfStruct,
  cols: Columns,
  row: TableRow,
  first: boolean,
  repeatHeader: () => void
): { page: number; top: number; bottom: number } {
  const facts = [row.location, ...row.details].filter((p) => p !== "").join(" · ");
  const lines = detailLines(row);
  const size = sizeOf(c, cols, row, facts, lines);
  let breakBefore = false;
  if (c.y + size.total > BOTTOM) {
    newPage(c);
    repeatHeader();
    breakBefore = true;
  }
  const top = c.y;
  if (!first && !breakBefore) drawRule(c, c.y);
  drawMainRow(c, table, cols, row, top + PAD, facts, size.nameH);
  c.y += size.main;
  if (lines.length > 0) {
    drawDetailRow(c, table, cols, lines);
    c.y += size.detail;
  }
  c.y += PAD;
  return { page: c.page, top, bottom: c.y };
}
