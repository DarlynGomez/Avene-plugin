import type { RootDisplayState } from "../../../shared/grouping/groupingTypes";
import styles from "./RootStatusDot.module.css";

const WORD: Partial<Record<RootDisplayState, string>> = {
  open: "Open",
  important: "Pinned",
  deferred: "Deferred"
};

interface RootStatusDotProps {
  displayState: RootDisplayState;
}

/**
 * Status word with a dot beside it, open green, pinned warning red, deferred muted grey
 * The word is the real text and the dot is decoration so the state is read once
 */
export function RootStatusDot({ displayState }: RootStatusDotProps) {
  if (displayState === "decided") {
    return null;
  }
  return (
    <span className={styles.status}>
      <span className={`${styles.dot} ${styles[displayState]}`} aria-hidden="true" />
      <span className={styles.word}>{WORD[displayState]}</span>
    </span>
  );
}
