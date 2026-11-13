import { Check } from "lucide-react";

import styles from "./LessonTakeaways.module.css";

interface LessonTakeawaysProps {
  id: string;
  takeaways: readonly string[];
  /** Null when the lesson has no quiz, then the quiz row is left out */
  questions: number | null;
  /** Opens the quiz, the row shows no button without it */
  onStart?: () => void;
}

/** The last block: what to remember, how many questions check it, and the button that starts them */
export function LessonTakeaways({ id, takeaways, questions, onStart }: LessonTakeawaysProps) {
  const heading = `${id}-takeaways`;
  return (
    <section className={styles.dark} aria-labelledby={heading}>
      <h2 id={heading} className={styles.label}>
        Key takeaways
      </h2>
      <ul className={styles.list}>
        {takeaways.map((takeaway) => (
          <li key={takeaway} className={styles.item}>
            <Check className={styles.icon} size={16} aria-hidden="true" />
            <span>{takeaway}</span>
          </li>
        ))}
      </ul>
      {questions !== null && (
        <div className={styles.quiz}>
          <div>
            <p className={styles.quizTitle}>Check your understanding</p>
            <p className={styles.quizMeta}>
              {questions} {questions === 1 ? "question" : "questions"}
            </p>
          </div>
          {onStart && (
            <button type="button" className={styles.start} onClick={onStart}>
              Start
            </button>
          )}
        </div>
      )}
    </section>
  );
}
