import { TriangleAlert } from "lucide-react";

import { parseCardLine } from "../../shared/handoff/cardParse";
import { renderLines } from "../../shared/handoff/render";
import type { AudienceDoc, DocSection } from "../../shared/handoff/types";
import styles from "./Document.module.css";

/** The counts, then the lines of the summary, the highest severity set apart as a yellow line */
export function SummaryCard({
  doc,
  section,
  kept
}: {
  doc: AudienceDoc;
  section: DocSection;
  kept: number;
}) {
  const fixes = doc.sections.find((s) => s.id === "action")?.groups?.length;
  return (
    <section className={styles.panel} aria-label="Summary">
      <div className={styles.summaryHead}>
        <h3 className={styles.sectionHead}>Summary</h3>
        {fixes !== undefined && (
          <span className={styles.stat}>{`${fixes} dev fixes • ${kept} kept`}</span>
        )}
      </div>
      {renderLines(section.lines, doc.slots, doc.audience).map((line, i) => {
        const parsed = parseCardLine(line);
        const text = parsed ? parsed.text : line;
        return /^Highest severity/.test(text) ? (
          <p key={i} className={styles.callout}>
            <TriangleAlert size={16} aria-hidden="true" />
            <span>{text}</span>
          </p>
        ) : (
          <p key={i} className={styles.row}>
            {text}
          </p>
        );
      })}
    </section>
  );
}
