import type { PdfDoc } from "pdfkit";

const REPLACEMENT = "?";

/** A cleaner for the two fonts, a character both can draw stays and every other one becomes a question mark */
export function makeCleaner(doc: PdfDoc): (text: string) => string {
  // Each font object is taken once, so asking about a character never changes the font being drawn with
  const fonts = (["Body", "Bold"] as const).map((name) => doc.font(name)._font.font);
  const cache = new Map<number, boolean>();
  const drawable = (codePoint: number) => {
    let ok = cache.get(codePoint);
    if (ok === undefined) {
      ok = fonts.every((font) => font.hasGlyphForCodePoint(codePoint));
      cache.set(codePoint, ok);
    }
    return ok;
  };
  // A tab, a line break or any other control character becomes a space, the font has no glyph for it
  const flat = (char: string) =>
    (char.codePointAt(0) ?? 0) < 32 || char === "\u007f" ? " " : char;
  return (text) =>
    Array.from(text, (char) => {
      const spaced = flat(char);
      return drawable(spaced.codePointAt(0) ?? 0) ? spaced : REPLACEMENT;
    }).join("");
}

/**
 * A letter with an accent is drawn from parts, and the parts go into the font file without being listed as used
 * PDFKit lists only the used ones in the glyph set the accessibility profile asks for, so the parts are listed here
 */
export function listEveryGlyph(doc: PdfDoc): void {
  for (const font of Object.values(doc._fontFamilies ?? {})) {
    // Writing the font file is what adds the parts to the subset, so it is done once ahead of the real write
    font.subset?.encode?.();
    const count = font.subset?.glyphs?.length ?? 0;
    if (!font.widths) continue;
    for (let gid = 0; gid < count; gid++) font.widths[gid] ??= 0;
  }
}
