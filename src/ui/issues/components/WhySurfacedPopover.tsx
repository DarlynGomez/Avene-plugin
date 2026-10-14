import { ArrowRight, HelpCircle, X } from "lucide-react";
import { useState } from "react";

import type { Severity } from "../../../shared/issues/issueTypes";
import { useExplanationLink } from "../teachMeWhy/ExplanationLinkContext";
import { whySurfacedContext } from "../whySurfacedText";
import styles from "./WhySurfacedPopover.module.css";

interface WhySurfacedPopoverProps {
  /** The root the popover belongs to, the button opens its explanation */
  signature: string;
  measuredRatio: number;
  requiredRatio: number;
  severity: Severity;
}

/**
 * A small help button opening plain context on why the shortfall matters
 * Short card level help, not the Teach Me Why content, no standards citations or links
 */
export function WhySurfacedPopover({
  signature,
  measuredRatio,
  requiredRatio,
  severity
}: WhySurfacedPopoverProps) {
  const [open, setOpen] = useState(false);
  const openExplanation = useExplanationLink();

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-label="Why this surfaced"
        onClick={() => setOpen((value) => !value)}
      >
        <HelpCircle size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.popover} role="status">
          <div className={styles.header}>
            <span className={styles.title}>Why this surfaced</span>
            <button
              type="button"
              className={styles.close}
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <p className={styles.ratioLine}>
            <span className={styles.ratioLabel}>Contrast ratio</span>
            <span>
              <strong>{measuredRatio.toFixed(2)}:1</strong> / req {requiredRatio.toFixed(1)}:1
            </span>
          </p>
          <p className={styles.context}>{whySurfacedContext(severity)}</p>
          {openExplanation && (
            <button
              type="button"
              className={styles.why}
              onClick={() => {
                setOpen(false);
                openExplanation(signature);
              }}
            >
              <span>Why this matters</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
