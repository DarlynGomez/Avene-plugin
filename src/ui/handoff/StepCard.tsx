import { useId, type ReactNode } from "react";

import styles from "./StepCard.module.css";

interface StepCardProps {
  /** The step number in the badge, absent for a card that is not a step */
  step?: number;
  title: string;
  /** Sits at the right of the title, a short status or hint */
  aside?: ReactNode;
  icon?: ReactNode;
  /** The card being worked in, drawn with a darker border */
  emphasis?: boolean;
  children: ReactNode;
}

/** A white card with a numbered badge and a title, so the tab reads top to bottom as steps */
export function StepCard({ step, title, aside, icon, emphasis = false, children }: StepCardProps) {
  const id = useId();
  return (
    <section className={`${styles.card} ${emphasis ? styles.emphasis : ""}`} aria-labelledby={id}>
      <header className={styles.header}>
        {step !== undefined && (
          <span className={styles.badge} aria-hidden="true">
            {step}
          </span>
        )}
        {icon}
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        {aside && <span className={styles.aside}>{aside}</span>}
      </header>
      {children}
    </section>
  );
}
