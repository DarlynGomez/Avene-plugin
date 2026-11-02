import { Plus } from "lucide-react";

import { parseCardLine } from "../../shared/handoff/cardParse";
import { renderLines } from "../../shared/handoff/render";
import type { AudienceDoc, DocSection } from "../../shared/handoff/types";
import styles from "./Document.module.css";
import base from "./Handoff.module.css";

/** The open questions with who should answer each, and the button to add one right here */
export function QuestionsSection({
  doc,
  section,
  number,
  onAdd
}: {
  doc: AudienceDoc;
  section: DocSection;
  number: number;
  onAdd: () => void;
}) {
  const shown = renderLines(section.lines, doc.slots, doc.audience).map((line) =>
    parseCardLine(line)
  );
  return (
    <section className={styles.section} aria-label={section.title}>
      <h3 className={styles.sectionHead}>
        {`${number}. ${section.title}`}
        <span className={styles.paren}>{`(${shown.length})`}</span>
        <button type="button" className={styles.addQuestion} onClick={onAdd}>
          <Plus size={14} aria-hidden="true" />
          Add question
        </button>
      </h3>
      {shown.length === 0 && <p className={base.helper}>No open questions yet.</p>}
      {shown.map((q, i) =>
        q ? (
          <p key={i} className={styles.question}>
            <span>{`• ${q.text}`}</span>
            {q.owner && <span className={styles.owner}>{q.owner}</span>}
          </p>
        ) : null
      )}
    </section>
  );
}
