import { Copy } from "lucide-react";
import { useState } from "react";

import { buildItems } from "../../shared/handoff/buildItems";
import { ALL_FORMATS, FORMAT_NAMES, rawText, type Format } from "../../shared/handoff/formats";
import type { ChosenText } from "../../shared/handoff/compose";
import type { Audience, AudienceDoc, HandoffInput } from "../../shared/handoff/types";
import { copyText } from "../study/downloadFile";
import { AUDIENCE_NAMES } from "./AudiencePicker";
import { BriefCards } from "./BriefCards";
import { CardsView } from "./CardsView";
import styles from "./Document.module.css";
import base from "./Handoff.module.css";
import { FormatTabs } from "./FormatTabs";
import { StepCard } from "./StepCard";
import { TicketCards } from "./TicketCards";
import { ViewToggle, type View } from "./ViewToggle";

interface HandoffDocumentProps {
  input: HandoffInput;
  doc: AudienceDoc;
  audience: Audience;
  chosenText: ChosenText;
  onShow: (nodeIds: readonly string[]) => void;
  onAddQuestion: () => void;
}

/** Step 3: the kinds of document, cards or exact text, and a quick copy that says it was not reviewed */
export function HandoffDocument({
  input,
  doc,
  audience,
  chosenText,
  onShow,
  onAddQuestion
}: HandoffDocumentProps) {
  const [format, setFormat] = useState<Format>("spec");
  const [view, setView] = useState<View>("cards");
  const [status, setStatus] = useState("");
  const text = rawText(format, input, audience, chosenText, null);
  const kept = buildItems(input).items.filter((item) => item.kind === "left").length;

  /** One click, template text only: an AI draft is never copied without a reviewer's name, so it waits for the review */
  async function quickCopy() {
    const copied = await copyText(rawText(format, input, audience, {}, null, true));
    setStatus(
      copied
        ? "Copied. It says it has not been reviewed."
        : "Copying did not work here. Switch to Text, select it and copy it by hand."
    );
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
      ) : format === "ticket" ? (
        <TicketCards input={input} audience={audience} />
      ) : format === "brief" ? (
        <BriefCards input={input} />
      ) : (
        <CardsView doc={doc} kept={kept} onShow={onShow} onAddQuestion={onAddQuestion} />
      )}
      <div className={styles.footer}>
        <span>
          Format: <strong>{FORMAT_NAMES[format]}</strong>
        </span>
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
