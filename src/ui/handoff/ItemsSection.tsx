import { parseCardLine } from "../../shared/handoff/cardParse";
import { renderLines } from "../../shared/handoff/render";
import type { AudienceDoc, DocSection } from "../../shared/handoff/types";
import styles from "./Document.module.css";
import { ItemCard } from "./ItemCard";

const HINTS: Record<string, string> = { action: "Exact testable criteria" };

/** A numbered section of items, one card each, or plain rows for a section of single lines */
export function ItemsSection({
  doc,
  section,
  number,
  onShow
}: {
  doc: AudienceDoc;
  section: DocSection;
  number: number;
  onShow: (nodeIds: readonly string[]) => void;
}) {
  const shown = renderLines(section.lines, doc.slots, doc.audience);
  let offset = 0;
  return (
    <section className={styles.section} aria-label={section.title}>
      <h3 className={styles.sectionHead}>
        {`${number}. ${section.title}`}
        {section.groups && <span className={styles.count}>{section.groups.length}</span>}
        {HINTS[section.id] && <span className={styles.hint}>{HINTS[section.id]}</span>}
      </h3>
      {section.groups ? (
        <ul className={styles.items}>
          {section.groups.map((group, i) => {
            const mine = shown.slice(offset, offset + group.lines.length);
            offset += group.lines.length;
            return <ItemCard key={i} lines={mine} group={group} onShow={onShow} />;
          })}
        </ul>
      ) : (
        <div className={styles.panel}>
          {shown.map((line, i) => {
            const parsed = parseCardLine(line);
            return (
              <p key={i} className={styles.row}>
                {parsed && (
                  <span
                    className={styles.mono}
                  >{`${parsed.label}${parsed.owner ? ` (${parsed.owner})` : ""}:`}</span>
                )}
                <span>{parsed ? parsed.text : line}</span>
              </p>
            );
          })}
        </div>
      )}
    </section>
  );
}
