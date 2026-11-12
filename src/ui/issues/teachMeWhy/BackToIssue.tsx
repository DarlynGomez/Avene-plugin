import { ArrowLeft } from "lucide-react";

import styles from "./BackToIssue.module.css";

/** Returns to the finding's card on the Live Watch tab, its own control above the explanation */
export function BackToIssue({ onBack }: { onBack: () => void }) {
  return (
    <div className={styles.bar}>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeft size={14} aria-hidden="true" />
        <span>Back to issue</span>
      </button>
    </div>
  );
}
