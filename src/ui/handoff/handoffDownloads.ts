import { loadPdfFonts } from "../../shared/handoff/pdf/pdfFonts";
import { buildTablePdf, handoffPdfFileName } from "../../shared/handoff/pdf/tablePdf";
import { buildTableHtml, handoffHtmlFileName } from "../../shared/handoff/tableHtml";
import type { HtmlTheme } from "../../shared/handoff/tableHtmlStyle";
import type { HandoffTableModel } from "../../shared/handoff/tableTypes";
import { downloadText } from "../calendar/downloadText";
import { TOKEN_VALUES } from "../theme/tokens";
import { downloadBytes } from "./downloadBytes";

/** The plugin's own palette, so a file made from the table looks like it */
function exportTheme(): HtmlTheme {
  return {
    ink: TOKEN_VALUES["--color-ink"],
    muted: TOKEN_VALUES["--color-muted"],
    background: TOKEN_VALUES["--color-background"],
    card: TOKEN_VALUES["--color-card"],
    line: TOKEN_VALUES["--color-line"]
  };
}

export function downloadHtmlFile(model: HandoffTableModel, generatedAt: string): void {
  downloadText(
    handoffHtmlFileName(generatedAt),
    buildTableHtml(model, exportTheme()),
    "text/html;charset=utf-8"
  );
}

export async function downloadPdfFile(
  model: HandoffTableModel,
  generatedAt: string
): Promise<void> {
  const bytes = await buildTablePdf(model, exportTheme(), loadPdfFonts());
  downloadBytes(handoffPdfFileName(generatedAt), bytes, "application/pdf");
}
