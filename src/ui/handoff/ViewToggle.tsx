import { LayoutGrid, Table, Terminal } from "lucide-react";

import styles from "./Document.module.css";

export type View = "table" | "cards" | "text";

interface ViewToggleProps {
  value: View;
  onChange: (view: View) => void;
}

/** A table to read across, cards to scan, or the exact text that will be copied */
export function ViewToggle({ value, onChange }: ViewToggleProps) {
  const button = (view: View, label: string, Icon: typeof LayoutGrid) => (
    <button
      type="button"
      aria-pressed={value === view}
      className={`${styles.toggleButton} ${value === view ? styles.toggleOn : ""}`}
      onClick={() => onChange(view)}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </button>
  );
  return (
    <div className={styles.toggle} role="group" aria-label="How to show the document">
      {button("table", "Table", Table)}
      {button("cards", "Cards", LayoutGrid)}
      {button("text", "Text", Terminal)}
    </div>
  );
}
