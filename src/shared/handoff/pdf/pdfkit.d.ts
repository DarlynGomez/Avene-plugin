/** The small part of PDFKit the handoff uses, the package ships no types of its own */
declare module "pdfkit" {
  export interface PdfStruct {
    dictionary: { data: Record<string, unknown> };
    add(child: PdfStruct | (() => void)): PdfStruct;
    end(): PdfStruct;
  }

  export interface PdfDoc {
    /** The font in use, the embedded one is asked which characters it can draw */
    _font: { font: { hasGlyphForCodePoint(codePoint: number): boolean } };
    /** The embedded fonts by name, read only to finish their glyph lists */
    _fontFamilies?: Record<
      string,
      { subset?: { glyphs?: number[]; encode?: () => unknown }; widths?: (number | undefined)[] }
    >;
    page: { margins: { top: number; bottom: number; left: number; right: number } };
    y: number;
    registerFont(name: string, data: Uint8Array): PdfDoc;
    font(name: string): PdfDoc;
    fontSize(size: number): PdfDoc;
    fillColor(color: string): PdfDoc;
    strokeColor(color: string): PdfDoc;
    lineWidth(width: number): PdfDoc;
    text(text: string, x?: number, y?: number, options?: Record<string, unknown>): PdfDoc;
    widthOfString(text: string): number;
    heightOfString(text: string, options?: Record<string, unknown>): number;
    rect(x: number, y: number, w: number, h: number): PdfDoc;
    circle(x: number, y: number, r: number): PdfDoc;
    moveTo(x: number, y: number): PdfDoc;
    lineTo(x: number, y: number): PdfDoc;
    fill(): PdfDoc;
    stroke(): PdfDoc;
    addPage(): PdfDoc;
    markContent(tag: string, options?: Record<string, unknown>): PdfDoc;
    endMarkedContent(): PdfDoc;
    struct(type: string, options?: Record<string, unknown>): PdfStruct;
    addStructure(element: PdfStruct): PdfDoc;
    on(event: "data", handler: (chunk: Uint8Array) => void): PdfDoc;
    on(event: "end" | "pageAdded", handler: () => void): PdfDoc;
    end(): void;
  }

  const PDFDocument: new (options?: Record<string, unknown>) => PdfDoc;
  export default PDFDocument;
}

declare module "*.woff?inline" {
  const dataUrl: string;
  export default dataUrl;
}
