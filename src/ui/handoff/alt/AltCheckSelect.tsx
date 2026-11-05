import { useId } from "react";

import { countLabel } from "../../../shared/handoff/alt/altCopy";
import filter from "../../issues/components/FilterBar.module.css";
import { useAltChecks, type CheckChoice } from "./AltChecksContext";
import styles from "./Alt.module.css";

interface AltCheckSelectProps {
  /** What the contrast check holds right now, which the Live Watch list already knows */
  contrast: { roots: number; issues: number };
}

/** Which checks the list shows, with what each holds, a native select so every key already works */
export function AltCheckSelect({ contrast }: AltCheckSelectProps) {
  const id = useId();
  const { check, setCheck, counts } = useAltChecks();
  return (
    <div className={styles.checkRow}>
      <label className={styles.checkLabel} htmlFor={id}>
        Check
      </label>
      <select
        id={id}
        className={`${filter.stateFilter} ${styles.checkSelect}`}
        value={check}
        onChange={(event) => setCheck(event.target.value as CheckChoice)}
      >
        <option value="all">All checks</option>
        <option value="contrast">
          Color &amp; Contrast ({countLabel(contrast.roots, contrast.issues)})
        </option>
        <option value="alt">
          Alt text &amp; Media Descriptions ({countLabel(counts.roots, counts.layers)})
        </option>
      </select>
    </div>
  );
}
