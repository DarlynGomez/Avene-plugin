import styles from "./StudyMessagePanel.module.css";

interface StudyMessagePanelProps {
  message: string;
  showWordmark: boolean;
}

/** The whole panel while feedback is withheld or the block is over, one line and nothing to act on */
export function StudyMessagePanel({ message, showWordmark }: StudyMessagePanelProps) {
  return (
    <main className={styles.panel} aria-label="CADT">
      {showWordmark && <span className={styles.wordmark}>CADT</span>}
      <p className={styles.message} role="status">
        {message}
      </p>
    </main>
  );
}
