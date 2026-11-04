import { renderLines } from "../../shared/handoff/render";
import type { AudienceDoc, DocSection } from "../../shared/handoff/types";
import { AUDIENCE_NAMES } from "./AudiencePicker";
import styles from "./Document.module.css";
import { ItemsSection } from "./ItemsSection";
import { QuestionsSection } from "./QuestionsSection";
import { SummaryCard } from "./SummaryCard";

interface CardsViewProps {
  doc: AudienceDoc;
  /** Items kept as they are, counted from the findings since not every version lists them */
  kept: number;
  onShow: (nodeIds: readonly string[]) => void;
  onAddQuestion: () => void;
}

const QUESTIONS: DocSection = { id: "questions", title: "Open questions", lines: [] };

/** The document as cards: the same lines as the text, numbered, with a button to find each layer */
export function CardsView({ doc, kept, onShow, onAddQuestion }: CardsViewProps) {
  const body = doc.sections.filter((s) => s.id !== "summary" && s.id !== "notCovered");
  const summary = doc.sections.find((s) => s.id === "summary");
  const notCovered = doc.sections.find((s) => s.id === "notCovered");
  const parts = body.some((s) => s.id === "questions") ? body : [...body, QUESTIONS];
  const lead = notCovered
    ? renderLines(notCovered.lines, doc.slots, doc.audience)
        .join(" ")
        .replace(/^[^:]+: /, "")
    : "";
  return (
    <div
      className={styles.scroll}
      tabIndex={0}
      aria-label={`Cards for ${AUDIENCE_NAMES[doc.audience].toLowerCase()}`}
    >
      {doc.notices.map((notice) => (
        <p key={notice} className={styles.notice}>
          {notice}
        </p>
      ))}
      {summary && <SummaryCard doc={doc} section={summary} kept={kept} />}
      {parts.map((section, i) =>
        section.id === "questions" ? (
          <QuestionsSection
            key={section.id}
            doc={doc}
            section={section}
            number={i + 1}
            onAdd={onAddQuestion}
          />
        ) : (
          <ItemsSection
            key={section.id}
            doc={doc}
            section={section}
            number={i + 1}
            onShow={onShow}
          />
        )
      )}
      {lead && (
        <p className={styles.notice}>
          <strong>What this check does not cover:</strong>
          {` ${lead.replace(/^Not covered by this check: /i, "")}`}
        </p>
      )}
    </div>
  );
}
