import type { StatusShape, TableStatus } from "../../shared/handoff/tableTypes";
import styles from "./HandoffTable.module.css";

const PATHS: Record<StatusShape, string> = {
  triangle: "M6 1 L11 10 L1 10 Z",
  square: "M2 2 H10 V10 H2 Z",
  diamond: "M6 1 L11 6 L6 11 L1 6 Z"
};

/** The status as words and a shape, the shape is decoration for sighted readers and the words are the status */
export function StatusMark({ status }: { status: TableStatus }) {
  return (
    <span className={styles.status}>
      <svg className={styles.shape} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d={PATHS[status.shape]} fill="currentColor" />
      </svg>
      <span>{status.text}</span>
    </span>
  );
}
