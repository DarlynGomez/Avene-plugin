import type { TableRow } from "../tableTypes";
import { artifact, CONTENT_WIDTH, PAGE, type Ctx } from "./pdfDraw";

/** The shape for a status, drawn for the eye only, the word beside it carries the meaning */
export function drawShape(c: Ctx, kind: TableRow["status"]["kind"], x: number, y: number): void {
  const { doc, theme } = c;
  const size = 6;
  const mid = y + 4.5;
  artifact(c, { type: "Layout" }, () => {
    doc.fillColor(theme.ink).strokeColor(theme.ink).lineWidth(1);
    if (kind === "open") doc.circle(x + size / 2, mid, size / 2).fill();
    else if (kind === "needsCheck") doc.circle(x + size / 2, mid, size / 2 - 0.5).stroke();
    else if (kind === "adjusted") doc.rect(x, mid - size / 2, size, size).fill();
    else if (kind === "ignored")
      doc
        .moveTo(x, mid)
        .lineTo(x + size, mid)
        .stroke();
    else doc.rect(x + 0.5, mid - size / 2 + 0.5, size - 1, size - 1).stroke();
  });
}

/** A line across the table, also only for the eye */
export function drawRule(c: Ctx, y: number): void {
  artifact(c, { type: "Layout" }, () => {
    const { doc, theme } = c;
    doc.strokeColor(theme.line).lineWidth(0.75);
    doc
      .moveTo(PAGE.margin, y)
      .lineTo(PAGE.margin + CONTENT_WIDTH, y)
      .stroke();
  });
}
