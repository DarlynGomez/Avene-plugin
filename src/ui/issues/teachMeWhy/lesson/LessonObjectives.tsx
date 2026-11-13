import cards from "./LessonCards.module.css";
import styles from "./Lesson.module.css";

/** What the lesson teaches, numbered, in a light card at the top */
export function LessonObjectives({
  id,
  objectives
}: {
  id: string;
  objectives: readonly string[];
}) {
  const heading = `${id}-learn`;
  return (
    <section className={cards.card} aria-labelledby={heading}>
      <h2 id={heading} className={styles.accentLabel}>
        What you will learn
      </h2>
      {/* The numbers are drawn by hand, so the role keeps the list a list where list styling would drop it */}
      <ol role="list" className={cards.objectives}>
        {objectives.map((objective, index) => (
          <li key={objective} className={cards.objective}>
            <span className={cards.numeral} aria-hidden="true">
              {index + 1}
            </span>
            <span>{objective}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
