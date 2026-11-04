import { Clock } from "lucide-react";

import type { Root } from "../../shared/grouping/groupingTypes";
import { useCalendar } from "./CalendarContext";
import styles from "./DeferButton.module.css";

interface DeferButtonProps {
  root: Root;
  onDefer: () => void;
  /** The card's own secondary button class, so Defer matches Ignore */
  className: string;
}

/**
 * Defer with how often it was deferred inside it
 * Once the whole root is deferred the same button offers focus time instead
 */
export function DeferButton({ root, onDefer, className }: DeferButtonProps) {
  const { available, counts, noteDeferred, openFor } = useCalendar();
  const count = available ? (counts[root.signature] ?? 0) : 0;
  const canDefer = (root.stateBreakdown.open ?? 0) > 0;
  const chip = count > 0 && <span className={styles.count}>{`${count}x`}</span>;

  if (canDefer) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => {
          onDefer();
          noteDeferred(root.signature);
        }}
      >
        <Clock size={14} aria-hidden="true" />
        <span>Defer</span>
        {chip}
      </button>
    );
  }
  if (count === 0 || root.displayState !== "deferred") return null;
  return (
    <button
      type="button"
      className={`${className} ${styles.muted}`}
      aria-label={`Schedule focus time, deferred ${count} ${count === 1 ? "time" : "times"}`}
      onClick={() => openFor(root.signature)}
    >
      <Clock size={14} aria-hidden="true" />
      <span>Defer</span>
      {chip}
    </button>
  );
}
