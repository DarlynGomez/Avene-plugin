import { Sparkles } from "lucide-react";

import { ALT_STYLES, ALT_STYLE_LABELS, type AltStyle } from "../../../shared/handoff/alt/altStyles";
import styles from "./AltSheet.module.css";

interface AltGenerateRowProps {
  style: AltStyle;
  onStyle: (style: AltStyle) => void;
  working: boolean;
  disabled: boolean;
  onGenerate: () => void;
}

/** The three settings for how the description is worded, and the button that asks for one */
export function AltGenerateRow({
  style,
  onStyle,
  working,
  disabled,
  onGenerate
}: AltGenerateRowProps) {
  return (
    <div className={styles.generateRow}>
      <div className={styles.styleTabs} role="radiogroup" aria-label="How to word it">
        {ALT_STYLES.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={style === option}
            className={`${styles.styleTab} ${style === option ? styles.styleTabOn : ""}`}
            onClick={() => onStyle(option)}
          >
            {ALT_STYLE_LABELS[option]}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={styles.generate}
        aria-busy={working}
        aria-disabled={disabled}
        onClick={() => {
          if (!working && !disabled) onGenerate();
        }}
      >
        <Sparkles size={16} aria-hidden="true" />
        {working ? "Generating..." : "Generate with AI"}
      </button>
    </div>
  );
}
