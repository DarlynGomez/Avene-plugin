import type { ReactNode } from "react";

import styles from "./Settings.module.css";

interface SettingsRowProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

/** A label on the left and its control or value on the right, wrapping when the panel is narrow */
export function SettingsRow({ label, hint, children }: SettingsRowProps) {
  return (
    <div className={styles.row}>
      <div>
        <div className={styles.rowLabel}>{label}</div>
        {hint && <p className={styles.hint}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}

interface SettingsCardProps {
  title: string;
  sub: string;
  /** Shown to the right of the title */
  aside?: ReactNode;
  children: ReactNode;
}

export function SettingsCard({ title, sub, aside, children }: SettingsCardProps) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h3 className={styles.cardTitle}>{title}</h3>
          <p className={styles.cardSub}>{sub}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
