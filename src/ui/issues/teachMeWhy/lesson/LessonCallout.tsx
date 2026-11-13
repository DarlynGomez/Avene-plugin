import type { CSSProperties } from "react";

import type { LessonCallout as CalloutData } from "../../../../shared/teachMeWhy/modules/moduleTypes";
import cards from "./LessonCards.module.css";
import styles from "./Lesson.module.css";

/** One lesson paragraph in a card, with a small table that shows the rule at real sizes */
export function LessonCallout({
  id,
  callout,
  text
}: {
  id: string;
  callout: CalloutData;
  text: string;
}) {
  const heading = `${id}-callout`;
  const [sample, size, needs] = callout.columns;
  return (
    <section className={cards.card} aria-labelledby={heading}>
      <h2 id={heading} className={styles.accentLabel}>
        {callout.label}
      </h2>
      <p className={styles.paragraph}>{text}</p>
      <table className={cards.table}>
        <caption className={styles.visuallyHidden}>{callout.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{sample}</th>
            <th scope="col">{size}</th>
            <th scope="col" className={cards.needs}>
              {needs}
            </th>
          </tr>
        </thead>
        <tbody>
          {callout.rows.map((row) => {
            // The sample is drawn at the size and weight the row is about, both come from the data
            const look = {
              "--sample-size": `${row.sample.px}px`,
              "--sample-weight": row.sample.weight
            } as CSSProperties;
            return (
              <tr key={row.size}>
                <td>
                  <span className={cards.sample} style={look} aria-hidden="true">
                    Aa
                  </span>
                </td>
                <td>
                  <span className={cards.sizeText}>{row.size}</span>
                  <span className={cards.meta}>{row.note}</span>
                </td>
                <td className={cards.needs}>{row.needs}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
