import { artifact, CONTENT_WIDTH, PAGE, type Ctx } from "./pdfDraw";

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
