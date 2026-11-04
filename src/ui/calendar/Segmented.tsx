import styles from "./Settings.module.css";

interface SegmentedProps<T extends string | number> {
  label: string;
  value: T;
  choices: readonly { value: T; text: string }[];
  onChange: (value: T) => void;
}

/** A compact row of exclusive choices, the chosen one filled */
export function Segmented<T extends string | number>({
  label,
  value,
  choices,
  onChange
}: SegmentedProps<T>) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {choices.map((choice) => (
        <button
          key={String(choice.value)}
          type="button"
          aria-pressed={choice.value === value}
          className={`${styles.segment} ${choice.value === value ? styles.segmentOn : ""}`}
          onClick={() => onChange(choice.value)}
        >
          {choice.text}
        </button>
      ))}
    </div>
  );
}
