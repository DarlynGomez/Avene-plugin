import { ArrowRight } from "lucide-react";

import type { ExplanationView } from "../../../shared/teachMeWhy/explanationView";
import styles from "./ExplanationCard.module.css";

/** The one place the wording of the AI label lives, the wording is not yet confirmed with Dr. Tigwell */
export const AI_LABEL =
  "Drafted in advance with AI help and reviewed by the research team. No AI runs while you use this.";

const LIST_MARK = "- ";

/** A block whose every line starts with the list mark is a list, anything else is a paragraph */
function TextBlock({ block }: { block: string }) {
  const lines = block.split("\n");
  if (lines.every((line) => line.startsWith(LIST_MARK))) {
    return (
      <ul className={styles.list}>
        {lines.map((line, index) => (
          <li key={`${index}:${line}`} className={styles.item}>
            {line.slice(LIST_MARK.length)}
          </li>
        ))}
      </ul>
    );
  }
  return <p className={styles.text}>{block}</p>;
}

interface ExplanationCardProps {
  view: ExplanationView;
  hidden: boolean;
  onHide: () => void;
  onShowAgain: () => void;
  onDeepDive: () => void;
}

/** The words, then the label and sources, with a quiet way to put it away */
export function ExplanationCard({
  view,
  hidden,
  onHide,
  onShowAgain,
  onDeepDive
}: ExplanationCardProps) {
  if (hidden) {
    return (
      <section className={styles.card} aria-label="Explanation">
        <p className={styles.quiet}>This explanation is hidden.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.action} onClick={onShowAgain}>
            Show again
          </button>
          <button type="button" className={styles.deepDive} onClick={onDeepDive}>
            <span>Deep dive into this rule</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className={styles.card} aria-label="Explanation">
      {view.text.split(/\n{2,}/).map((block) => (
        <TextBlock key={block} block={block} />
      ))}
      {view.isAi && (
        <>
          <p className={styles.note}>{AI_LABEL}</p>
          {view.basedOn.length > 0 && (
            <p className={styles.note}>Based on: {view.basedOn.join("; ")}</p>
          )}
        </>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.action} onClick={onHide}>
          Dismiss
        </button>
        <button type="button" className={styles.deepDive} onClick={onDeepDive}>
          <span>Deep dive into this rule</span>
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
