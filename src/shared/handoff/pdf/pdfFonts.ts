import bold from "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff?inline";
import regular from "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff?inline";

export interface PdfFonts {
  regular: Uint8Array;
  bold: Uint8Array;
}

function bytesOf(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** Atkinson Hyperlegible, Latin, regular and bold, under the SIL Open Font License, embedded so no reader substitutes one */
export function loadPdfFonts(): PdfFonts {
  return { regular: bytesOf(regular), bold: bytesOf(bold) };
}
