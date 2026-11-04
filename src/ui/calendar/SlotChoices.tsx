import { useId } from "react";

import { dayLabel, formatClock, partLabel } from "../../shared/calendar/slots";
import styles from "./Schedule.module.css";

interface SlotChoicesProps {
  now: Date;
  suggested: Date;
  minutes: number;
  mode: "suggested" | "custom";
  onMode: (mode: "suggested" | "custom") => void;
  date: string;
  time: string;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
  /** Shown under the fields when the date and time are not a real moment */
  invalid: boolean;
}

/** A suggested slot or a time of the designer's own, the fields appear only for the second */
export function SlotChoices({
  now,
  suggested,
  minutes,
  mode,
  onMode,
  date,
  time,
  onDate,
  onTime,
  invalid
}: SlotChoicesProps) {
  const id = useId();
  const card = (kind: "suggested" | "custom", name: string, sub: string) => (
    <button
      type="button"
      aria-pressed={mode === kind}
      className={`${styles.choice} ${mode === kind ? styles.choiceOn : ""}`}
      onClick={() => onMode(kind)}
    >
      <span className={styles.choiceName}>{name}</span>
      <span className={styles.choiceSub}>{sub}</span>
    </button>
  );
  return (
    <>
      <p className={styles.label}>Date &amp; time</p>
      <div className={styles.choices}>
        {card(
          "suggested",
          `${dayLabel(now, suggested)} ${partLabel(suggested)}`,
          `${formatClock(suggested)} (${minutes} mins)`
        )}
        {card("custom", "Custom time", "Select date and hour")}
      </div>
      {mode === "custom" && (
        <div className={styles.fields}>
          <label className={styles.field} htmlFor={`${id}-date`}>
            Date
            <input
              id={`${id}-date`}
              className={styles.input}
              type="date"
              value={date}
              onChange={(e) => onDate(e.target.value)}
            />
          </label>
          <label className={styles.field} htmlFor={`${id}-time`}>
            Time
            <input
              id={`${id}-time`}
              className={styles.input}
              type="time"
              value={time}
              onChange={(e) => onTime(e.target.value)}
            />
          </label>
          {invalid && (
            <p className={styles.error} role="alert">
              Choose a date and a time to continue.
            </p>
          )}
        </div>
      )}
    </>
  );
}
