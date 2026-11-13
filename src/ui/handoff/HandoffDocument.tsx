import { Copy, Download, FileText } from "lucide-react";
import { useMemo, useState } from "react";

import { buildItems } from "../../shared/handoff/buildItems";
import { ALL_FORMATS, FORMAT_NAMES, rawText, type Format } from "../../shared/handoff/formats";
import { buildHandoffTable } from "../../shared/handoff/tableModel";
import { renderTableText } from "../../shared/handoff/tableText";
import type { ChosenText } from "../../shared/handoff/compose";
import type { Audience, AudienceDoc, HandoffInput } from "../../shared/handoff/types";
import { copyText } from "../study/downloadFile";
import { AUDIENCE_NAMES } from "./AudiencePicker";
import { downloadHtmlFile, downloadPdfFile } from "./handoffDownloads";
import { BriefCards } from "./BriefCards";
import { CardsView } from "./CardsView";
import styles from "./Document.module.css";
import base from "./Handoff.module.css";
import { FormatTabs } from "./FormatTabs";
import { HandoffTable } from "./HandoffTable";
import { StepCard } from "./StepCard";
import { TicketCards } from "./TicketCards";
import { ViewToggle, type View } from "./ViewToggle";

interface HandoffDocumentProps {
  input: HandoffInput;
  doc: AudienceDoc;
  audience: Audience;
  chosenText: ChosenText;
  /** The build that made the data, for the line under the table title */
  buildId?: string | null;
  onShow: (nodeIds: readonly string[]) => void;
  onAddQuestion: () => void;
}

/** Step 3: the kinds of document, cards or exact text, and a quick copy that says it was not reviewed */
export function HandoffDocument({
  input,
  doc,
  audience,
  chosenText,
  buildId = null,
  onShow,
  onAddQuestion
}: HandoffDocumentProps) {
  const [format, setFormat] = useState<Format>("spec");
  const [view, setView] = useState<View>("table");
  const [status, setStatus] = useState("");
  const text = rawText(format, input, audience, chosenText, null);
  const model = useMemo(
    () => buildHandoffTable(input, audience, buildId),
    [input, audience, buildId]
  );
  const asTable = view === "table" && format === "spec";
  const kept = buildItems(input).items.filter((item) => item.kind === "left").length;

  /** One click, template text only: an AI draft is never copied without a reviewer's name, so it waits for the review */
  async function quickCopy() {
    // The table on screen copies as a plain text table of the same rows, the other views copy their own text
    const copied = await copyText(
      asTable ? renderTableText(model) : rawText(format, input, audience, {}, null, true)
    );
    setStatus(
      copied
        ? "Copied. It says it has not been reviewed."
        : "Copying did not work here. Switch to Text, select it and copy it by hand."
    );
  }

  /** The same table as a file, made here: the html at once, the PDF when it is ready */
  async function download(kind: "html" | "pdf") {
    try {
      if (kind === "html") downloadHtmlFile(model, input.generatedAt);
      else await downloadPdfFile(model, input.generatedAt);
    } catch {
      setStatus("The file could not be made here. Copy the table instead.");
    }
  }

  return (
    <StepCard
      emphasis
      step={3}
      title="Handoff document"
      aside={<ViewToggle value={view} onChange={setView} />}
    >
      <FormatTabs formats={ALL_FORMATS} value={format} onChange={setFormat} />
      {view === "text" ? (
        <pre
          className={base.preview}
          tabIndex={0}
          aria-label={`Document for ${AUDIENCE_NAMES[audience].toLowerCase()}`}
        >
          {text}
        </pre>
      ) : asTable ? (
        <HandoffTable model={model} onShow={onShow} />
      ) : format === "ticket" ? (
        <TicketCards input={input} audience={audience} />
      ) : format === "brief" ? (
        <BriefCards input={input} />
      ) : (
        <CardsView doc={doc} kept={kept} onShow={onShow} onAddQuestion={onAddQuestion} />
      )}
      <div className={styles.footer}>
        <span>
          Format: <strong>{asTable ? "Table" : FORMAT_NAMES[format]}</strong>
        </span>
        {asTable && (
          <button type="button" className={styles.quickCopy} onClick={() => void download("html")}>
            <Download size={16} aria-hidden="true" />
            Download HTML
          </button>
        )}
        {asTable && (
          <button type="button" className={styles.quickCopy} onClick={() => void download("pdf")}>
            <FileText size={16} aria-hidden="true" />
            Download PDF
          </button>
        )}
        <button type="button" className={styles.quickCopy} onClick={() => void quickCopy()}>
          <Copy size={16} aria-hidden="true" />
          Quick copy raw
        </button>
      </div>
      <p className={base.helper} role="status">
        {status}
      </p>
    </StepCard>
  );
}
