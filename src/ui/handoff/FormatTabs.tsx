import { FORMAT_NAMES, type Format } from "../../shared/handoff/formats";
import styles from "./Document.module.css";

interface FormatTabsProps {
  formats: readonly Format[];
  value: Format;
  onChange: (format: Format) => void;
}

/** The kinds of document for this reader, nothing is shown when there is only one */
export function FormatTabs({ formats, value, onChange }: FormatTabsProps) {
  if (formats.length < 2) return null;
  return (
    <div className={styles.tabs} role="tablist" aria-label="Kind of document">
      {formats.map((format) => (
        <button
          key={format}
          type="button"
          role="tab"
          aria-selected={value === format}
          className={`${styles.tab} ${value === format ? styles.tabOn : ""}`}
          onClick={() => onChange(format)}
        >
          {FORMAT_NAMES[format]}
        </button>
      ))}
    </div>
  );
}
