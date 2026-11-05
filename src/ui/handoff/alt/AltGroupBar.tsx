import type { AltGroupBy } from "../../../shared/handoff/alt/altRoots";
import styles from "../../issues/components/FilterBar.module.css";
import { useAltChecks } from "./AltChecksContext";

const OPTIONS: readonly { value: AltGroupBy; label: string }[] = [
  { value: "root-cause", label: "Image" },
  { value: "screen", label: "Screen" }
];

/** The same Group control as the contrast list, by picture or by screen */
export function AltGroupBar() {
  const { groupBy, setGroupBy } = useAltChecks();
  return (
    <div className={styles.bar}>
      <div className={styles.groupControl} role="radiogroup" aria-label="Group image layers by">
        <span className={styles.groupLabel}>Group:</span>
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={groupBy === option.value}
            className={`${styles.groupOption} ${groupBy === option.value ? styles.groupOptionActive : ""}`}
            onClick={() => setGroupBy(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
