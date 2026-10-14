import type { ExplanationView } from "../../../shared/teachMeWhy/explanationView";
import styles from "./ExplanationCard.module.css";

export const AI_LABEL = "Written in advance by AI, reviewed by the research team.";

interface ExplanationCardProps {
  view: ExplanationView;
  hidden: boolean;
  onHide: () => void;
  onShowAgain: () => void;
}

/** The words, then the label and sources, with a quiet way to put it away */
export function ExplanationCard({ view, hidden, onHide, onShowAgain }: ExplanationCardProps) {
  if (hidden) {
    return (
      <section className={styles.card} aria-label="Explanation">
        <p className={styles.quiet}>This explanation is hidden.</p>
        <button type="button" className={styles.action} onClick={onShowAgain}>
          Show again
        </button>
      </section>
    );
  }
  return (
    <section className={styles.card} aria-label="Explanation">
      {view.text.split(/\n{2,}/).map((paragraph) => (
        <p key={paragraph} className={styles.text}>
          {paragraph}
        </p>
      ))}
      {view.isAi && (
        <>
          <p className={styles.note}>{AI_LABEL}</p>
          {view.basedOn.length > 0 && (
            <p className={styles.note}>Based on: {view.basedOn.join(", ")}</p>
          )}
          <button type="button" className={styles.action} onClick={onHide}>
            Hide this explanation
          </button>
        </>
      )}
    </section>
  );
}
