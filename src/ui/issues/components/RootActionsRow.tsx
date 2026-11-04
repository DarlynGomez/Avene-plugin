import { EyeOff, Pin, Sliders } from "lucide-react";

import type { Root } from "../../../shared/grouping/groupingTypes";
import { DeferButton } from "../../calendar/DeferButton";
import styles from "./RootActionsRow.module.css";

interface RootActionsRowProps {
  root: Root;
  canAdjust: boolean;
  onAdjust: () => void;
  onIgnore: () => void;
  onDefer: () => void;
  onToggleImportant: () => void;
}

/**
 * Adjust and Ignore on the left, Defer and the pin on the right
 * A fully decided root offers none of these, reopen lives in the decisions view
 */
export function RootActionsRow({
  root,
  canAdjust,
  onAdjust,
  onIgnore,
  onDefer,
  onToggleImportant
}: RootActionsRowProps) {
  if (root.displayState === "decided") {
    return null;
  }

  const isImportant = root.displayState === "important";

  return (
    <div className={styles.actions}>
      <div className={styles.leftGroup}>
        {canAdjust && (
          <button type="button" className={styles.primaryButton} onClick={onAdjust}>
            <Sliders size={14} aria-hidden="true" />
            <span>Adjust</span>
          </button>
        )}
        <button type="button" className={styles.secondaryButton} onClick={onIgnore}>
          <EyeOff size={14} aria-hidden="true" />
          <span>Ignore</span>
        </button>
      </div>
      <div className={styles.rightGroup}>
        <DeferButton root={root} onDefer={onDefer} className={styles.secondaryButton} />
        <button
          type="button"
          className={`${styles.importantToggle} ${isImportant ? styles.importantActive : ""}`}
          aria-pressed={isImportant}
          aria-label={isImportant ? "Remove important flag" : "Flag as important"}
          title={isImportant ? "Remove important flag" : "Flag as important"}
          onClick={onToggleImportant}
        >
          <Pin size={14} aria-hidden="true" fill={isImportant ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}
