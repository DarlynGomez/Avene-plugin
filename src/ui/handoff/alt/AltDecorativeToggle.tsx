import { useId } from "react";

import styles from "./AltSheet.module.css";

interface AltDecorativeToggleProps {
  decorative: boolean;
  onChange: (value: boolean) => void;
}

/** A switch for an image that is only there for looks, so it needs no text */
export function AltDecorativeToggle({ decorative, onChange }: AltDecorativeToggleProps) {
  const id = useId();
  return (
    <label className={styles.decorativeCard} htmlFor={id}>
      <span className={styles.decorativeText}>
        <span className={styles.cardTitle}>Decorative element</span>
        <span className={styles.sub}>Screen readers will skip this element</span>
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className={styles.switch}
        checked={decorative}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
