import PDFDocument, { type PdfStruct } from "pdfkit";

import { NOT_REVIEWED_LINE } from "../fixedLines";
import type { HtmlTheme } from "../tableHtmlStyle";
import { countsLine } from "../tableText";
import type { HandoffTableModel } from "../tableTypes";
import {
  BOTTOM,
  CONTENT_WIDTH,
  drawText,
  furniture,
  heightOf,
  leaf,
  newPage,
  node,
  PAGE,
  type Ctx,
  type Font
} from "./pdfDraw";
import type { PdfFonts } from "./pdfFonts";
import { drawGroup, type ItemPlacement } from "./pdfTable";
import { listEveryGlyph, makeCleaner } from "./pdfText";

/** avene-handoff-2026-11-13.pdf, from the day the handoff was made */
export function handoffPdfFileName(generatedAt: string): string {
  return `avene-handoff-${generatedAt.slice(0, 10)}.pdf`;
}

export interface PdfOptions {
  /** Left readable for a test or a checker, a person gets the compressed file */
  compress?: boolean;
  /** Filled with the page and the top and bottom of every item, so a test can see none was split */
  placements?: ItemPlacement[];
}

/** A block of text as one tagged element, moved to a new page first when it would not fit */
function paragraph(
  c: Ctx,
  parent: PdfStruct,
  type: string,
  font: Font,
  size: number,
  color: string,
  text: string
) {
  const h = heightOf(c, font, size, text, CONTENT_WIDTH);
  if (c.y + h > BOTTOM) newPage(c);
  const at = c.y;
  leaf(c, parent, type, () => drawText(c, font, size, color, text, PAGE.margin, at, CONTENT_WIDTH));
  c.y += h;
}

function collect(doc: Ctx["doc"]): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  return new Promise((resolve) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const out = new Uint8Array(chunks.reduce((n, part) => n + part.length, 0));
      let at = 0;
      for (const part of chunks) {
        out.set(part, at);
        at += part.length;
      }
      resolve(out);
    });
  });
}

/**
 * The same model as the screen and the html file, as a tagged PDF on letter paper with 0.75 inch margins
 * The tree is Document > H1, P, P, then a Sect for each group holding an H2 and a Table of TR, TH and TD
 */
export function buildTablePdf(
  model: HandoffTableModel,
  theme: HtmlTheme,
  fonts: PdfFonts,
  options: PdfOptions = {}
): Promise<Uint8Array> {
  const { header } = model;
  const title = header.title.trim() === "" ? "Untitled file" : header.title;
  const doc = new PDFDocument({
    size: "LETTER",
    margin: PAGE.margin,
    pdfVersion: "1.7",
    tagged: true,
    subset: "PDF/UA",
    // No default font, so the browser build needs none of the 14 built in ones and the file holds only the embedded two
    font: false,
    lang: "en-US",
    displayTitle: true,
    compress: options.compress ?? true,
    info: { Title: `${title}: accessibility handoff`, Creator: "Avene", Subject: header.subtitle }
  });
  doc.registerFont("Body", fonts.regular);
  doc.registerFont("Bold", fonts.bold);
  const c: Ctx = { doc, clean: makeCleaner(doc), theme, title, y: PAGE.margin, page: 1 };
  doc.on("pageAdded", () => {
    c.page += 1;
    furniture(c);
  });
  furniture(c);
  const done = collect(doc);
  const placed = options.placements ?? [];

  node(c, null, "Document", {}, (root) => {
    paragraph(c, root, "H1", "Bold", 20, theme.ink, title);
    c.y += 4;
    paragraph(c, root, "P", "Body", 10, theme.muted, header.subtitle);
    paragraph(c, root, "P", "Body", 10, theme.muted, countsLine(header.counts));
    c.y += 8;
    if (model.empty) paragraph(c, root, "P", "Body", 10, theme.ink, model.empty);
    for (const group of model.groups) {
      // A heading is never left alone at the bottom of a page
      if (c.y + 90 > BOTTOM) newPage(c);
      node(c, root, "Sect", {}, (section) => {
        paragraph(c, section, "H2", "Bold", 13, theme.ink, `${group.title} ${group.rows.length}`);
        c.y += 4;
        drawGroup(c, section, group, placed);
      });
      c.y += 14;
    }
    paragraph(c, root, "P", "Body", 9, theme.muted, NOT_REVIEWED_LINE);
  });
  listEveryGlyph(doc);
  doc.end();
  return done;
}
