import type { PdfDoc, PdfStruct } from "pdfkit";

import type { HtmlTheme } from "../tableHtmlStyle";

/** Letter size in points, with 0.75 inch margins */
export const PAGE = { width: 612, height: 792, margin: 54 } as const;
export const CONTENT_WIDTH = PAGE.width - 2 * PAGE.margin;
export const BOTTOM = PAGE.height - PAGE.margin;

export interface Ctx {
  doc: PdfDoc;
  /** Replaces what the embedded font cannot draw, a missing glyph would make the file fail the accessibility check */
  clean: (text: string) => string;
  theme: HtmlTheme;
  /** The running header, the file name */
  title: string;
  y: number;
  page: number;
}

export type Font = "Body" | "Bold";

export function heightOf(c: Ctx, font: Font, size: number, text: string, width: number): number {
  c.doc.font(font).fontSize(size);
  return c.doc.heightOfString(c.clean(text), { width });
}

/** Draws text where it is told, the caller has already made sure it fits on the page */
export function drawText(
  c: Ctx,
  font: Font,
  size: number,
  color: string,
  text: string,
  x: number,
  y: number,
  width: number,
  align: "left" | "right" = "left"
): void {
  c.doc.font(font).fontSize(size).fillColor(color).text(c.clean(text), x, y, { width, align });
}

/** A link to a layer in the file: the words underlined, and an annotation tagged as part of the Link element */
export function drawLink(
  c: Ctx,
  owner: PdfStruct,
  label: string,
  url: string,
  x: number,
  y: number
): void {
  const text = "Open in Figma";
  const { doc } = c;
  doc
    .font("Body")
    .fontSize(9)
    .fillColor(c.theme.ink)
    .text(text, x, y, { underline: true, lineBreak: false });
  // A tagged link needs words for what it opens, kept as a PDF string object so it is written as text
  doc.link(x, y, doc.widthOfString(text), 12, url, {
    structParent: owner,
    Contents: Object(`Open in Figma: ${c.clean(label)}`)
  });
}

/** One structure element under a parent, or under the document when there is none, ended when the body is done */
export function node(
  c: Ctx,
  parent: PdfStruct | null,
  type: string,
  options: Record<string, unknown>,
  body?: (self: PdfStruct) => void,
  attributes?: Record<string, unknown>
): PdfStruct {
  const element = c.doc.struct(type, options);
  if (attributes) element.dictionary.data.A = { ...attributes };
  if (parent) parent.add(element);
  else c.doc.addStructure(element);
  body?.(element);
  element.end();
  return element;
}

/** A leaf that owns the drawn text, so the text is read as that element and in this order */
export function leaf(
  c: Ctx,
  parent: PdfStruct,
  type: string,
  draw: () => void,
  options: Record<string, unknown> = {},
  attributes?: Record<string, unknown>
): void {
  node(c, parent, type, options, (self) => self.add(draw), attributes);
}

/** Anything drawn only for the eye: lines, fills, shapes and page furniture, kept out of the reading order */
export function artifact(c: Ctx, options: Record<string, unknown>, draw: () => void): void {
  c.doc.markContent("Artifact", options);
  draw();
  c.doc.endMarkedContent();
}

/** The running header and the page number, both artifacts so a screen reader never reads them */
export function furniture(c: Ctx): void {
  const { doc, theme } = c;
  const { margins } = doc.page;
  const saved = margins.bottom;
  margins.bottom = 0;
  // The first page already opens with the title, so the running header starts on the second
  if (c.page > 1) {
    artifact(c, { type: "Pagination" }, () => {
      drawText(c, "Body", 9, theme.muted, c.title, PAGE.margin, 30, CONTENT_WIDTH - 60);
    });
  }
  artifact(c, { type: "Pagination" }, () => {
    drawText(
      c,
      "Body",
      9,
      theme.muted,
      `Page ${c.page}`,
      PAGE.margin,
      PAGE.height - 36,
      CONTENT_WIDTH,
      "right"
    );
  });
  margins.bottom = saved;
}

export function newPage(c: Ctx): void {
  c.doc.addPage();
  c.y = PAGE.margin;
}
