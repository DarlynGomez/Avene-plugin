import type { PdfStruct } from "pdfkit";

import type { TableGroup } from "../tableTypes";
import { artifact, CONTENT_WIDTH, drawText, heightOf, leaf, node, PAGE, type Ctx } from "./pdfDraw";
import { drawItem } from "./pdfItem";
import { columnsFor, innerWidth, PAD, SMALL, type Columns } from "./pdfLayout";
import { drawRule } from "./pdfShape";

export interface ItemPlacement {
  page: number;
  top: number;
  bottom: number;
}

/** The column titles, real header cells on the first page and an artifact copy on every page after */
function header(c: Ctx, parent: PdfStruct | null, cols: Columns): void {
  const titles = cols.contrast ? ["Element", "Contrast", "Status"] : ["Image", "Status"];
  const h = heightOf(c, "Body", SMALL, "Ag", 100) + 2 * PAD - 2;
  artifact(c, { type: "Layout" }, () => {
    c.doc.fillColor(c.theme.background).rect(PAGE.margin, c.y, CONTENT_WIDTH, h).fill();
  });
  const draw = (i: number) => () => {
    const align = i === titles.length - 1 ? "right" : "left";
    drawText(
      c,
      "Body",
      SMALL,
      c.theme.muted,
      titles[i],
      cols.x[i] + PAD,
      c.y + PAD - 1,
      innerWidth(cols, i),
      align
    );
  };
  if (parent) {
    node(c, parent, "TR", {}, (tr) =>
      titles.forEach((_, i) => leaf(c, tr, "TH", draw(i), { scope: "Column" }))
    );
  } else {
    titles.forEach((_, i) => artifact(c, { type: "Layout" }, draw(i)));
  }
  drawRule(c, c.y + h);
  c.y += h;
}

/** One group as a tagged table: a header row, then two rows for each item, kept whole on a page */
export function drawGroup(
  c: Ctx,
  section: PdfStruct,
  group: TableGroup,
  placed: ItemPlacement[]
): void {
  const cols = columnsFor(group.id === "contrast");
  node(c, section, "Table", {}, (table) => {
    header(c, table, cols);
    group.rows.forEach((row, i) => {
      placed.push(drawItem(c, table, cols, row, i === 0, () => header(c, null, cols)));
    });
  });
}
