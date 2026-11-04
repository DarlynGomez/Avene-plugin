import type { FocusItem } from "../../shared/calendar/types";
import styles from "./Schedule.module.css";

/** Items listed past this many are counted instead */
const SHOWN = 3;

/** What is being scheduled: each root with its measured ratio and what kind of review it needs */
export function FocusSummary({ items }: { items: readonly FocusItem[] }) {
  const more = items.length - SHOWN;
  return (
    <ul className={styles.summary} aria-label="What this time is for">
      {items.slice(0, SHOWN).map((item) => (
        <li key={item.signature} className={styles.item}>
          <span className={styles.itemText}>
            <strong className={styles.name}>{item.name}</strong>
            <span className={styles.measure}>{measureOf(item)}</span>
          </span>
          <span className={styles.tag}>
            {item.binding ? "NEEDS TOKEN REVIEW" : "NEEDS COLOR REVIEW"}
          </span>
        </li>
      ))}
      {more > 0 && <li className={styles.more}>{`and ${more} more`}</li>}
    </ul>
  );
}

/** The ratio as the card shows it, with the hex pair only when the name is not already that pair */
function measureOf(item: FocusItem): string {
  const pair = `${item.foregroundHex} on ${item.backgroundHex}`;
  const ratio = `${item.measuredRatio.toFixed(2)}:1 contrast`;
  return item.name === pair ? ratio : `${ratio} (${pair})`;
}
